package cat.mulassa.games.launcher

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.provider.Settings
import android.view.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.setValue
import kotlin.math.atan2
import kotlin.math.exp
import kotlin.math.tanh

// Ronda 37 (the owner found ronda 36's lean cheap; Astra's recipe with Neon's sensor): how the phone is held against how it
// was held a moment ago, as two numbers in -1..1 (x: its right edge nearer the player, y: its bottom edge nearer), for the
// grid's cartridges to turn with, the art behind their windows to slide, and the clouds to drift.
// The fused attitude (the game rotation vector: gyroscope and accelerometer, no compass) as the tilt of the screen's normal
// against a reference attitude: 18° is the whole lean, eased past it. The level follows the hand slowly (8 s), so holding
// the phone at any angle becomes level again; past 60° a new reference is taken. One exponential filter (45 ms) per
// sample. A phone without that sensor keeps its cartridges level. Read only inside layer and draw blocks: a new sample
// moves layers, it recomposes nothing. The sensor is registered only while the grid shows: the launcher in front (its
// onResume to onPause: never under a game) and nothing over the grid (`covered`: a picked cartridge, the account sheet);
// off when the system's animations are. The screen's own axes, whichever way a tablet is held (`screen`). The same
// numbers as iOS (Motion.swift).
object Tilt : SensorEventListener {
    var x by mutableFloatStateOf(0f); private set
    var y by mutableFloatStateOf(0f); private set
    var covered = false // a picked cartridge or the account sheet is over the grid: level, and the sensor off
        set(v) { if (field != v) { field = v; listen() } }
    private var sensors: SensorManager? = null // while the launcher is in front
    private var rotation: () -> Int = { Surface.ROTATION_0 }
    private var turned = Surface.ROTATION_0
    private var listening = false
    private var reference: FloatArray? = null
    private val now = FloatArray(9)
    private var flatX = 0f; private var flatY = 0f // radians: where «flat» is, following the hand
    private var last = 0L
    private var held = false

    // `rotation`: the display's, asked on every sample (a tablet turned on its side keeps the activity)
    fun start(ctx: Context, rotation: () -> Int) {
        if (held || Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f) return
        sensors = ctx.applicationContext.getSystemService(SensorManager::class.java)
        this.rotation = rotation
        listen()
    }

    fun stop() {
        sensors?.unregisterListener(this)
        sensors = null; listening = false; rotation = { Surface.ROTATION_0 }
        level()
    }

    private fun listen() {
        val on = sensors != null && !covered
        if (on == listening) return
        listening = on
        if (!on) { sensors?.unregisterListener(this); return level() }
        val attitude = sensors?.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR) ?: return
        sensors?.registerListener(this, attitude, SensorManager.SENSOR_DELAY_GAME)
    }

    private fun level() { reference = null; if (!held) { x = 0f; y = 0f } }

    // debug builds only (LauncherActivity's `--es tilt 0.9,-0.6`): a lean held for captures on an emulator
    fun hold(x: Float, y: Float) { held = true; this.x = x; this.y = y }

    // debug builds only (`--es tilt sweep`): the lean moved as a hand would, for recordings. 9 s, then again: 3 s rolling
    // side to side, 3 s nodding, 3 s round a circle; the same path as iOS's Tilt.swept
    fun sweep() {
        held = true
        val from = System.nanoTime()
        val frames = android.view.Choreographer.getInstance()
        frames.postFrameCallback(object : android.view.Choreographer.FrameCallback {
            override fun doFrame(now: Long) {
                val s = ((now - from) / 1e9) % 9; val a = kotlin.math.sin(s % 3 / 3 * 2 * Math.PI).toFloat()
                if (covered) { x = 0f; y = 0f } else if (s < 3) { x = a; y = 0f } else if (s < 6) { x = 0f; y = a } else {
                    val w = (s - 6) / 3 * 2 * Math.PI; x = kotlin.math.sin(w).toFloat(); y = (kotlin.math.sin(w + Math.PI / 2) * 0.8).toFloat()
                }
                frames.postFrameCallback(this)
            }
        })
    }

    override fun onSensorChanged(e: SensorEvent) {
        if (held) return
        SensorManager.getRotationMatrixFromVector(now, e.values) // the phone's axes in the world's
        val turn = rotation()
        if (turn != turned) { turned = turn; reference = null } // the screen turned: a new level, in its new axes
        val r = reference ?: return begin(e.timestamp)
        // the screen's normal now (the matrix's third column), in the reference's own axes (x right, y up, z to the player)
        val nx = r[0] * now[2] + r[3] * now[5] + r[6] * now[8]; val ny = r[1] * now[2] + r[4] * now[5] + r[7] * now[8]
        val nz = r[2] * now[2] + r[5] * now[5] + r[8] * now[8]
        if (nz < 0.5f) return begin(e.timestamp)
        val (sx, sy) = screen(nx, ny, turn)
        val ax = -atan2(sx, nz); val ay = atan2(sy, nz); val dt = ((e.timestamp - last) / 1e9f).coerceIn(0f, 0.1f)
        last = e.timestamp
        val slow = 1 - exp(-dt / 8f); val quick = 1 - exp(-dt / 0.045f)
        flatX += (ax - flatX) * slow; flatY += (ay - flatY) * slow
        val tx = x + (tanh(past(ax - flatX) / FULL) - x) * quick; val ty = y + (tanh(past(ay - flatY) / FULL) - y) * quick
        if (kotlin.math.abs(tx - x) > 0.002f || kotlin.math.abs(ty - y) > 0.002f) { x = tx; y = ty } // still: nothing is redrawn
    }

    // The normal's sideways parts, from the device's axes (x to its natural right, y to its natural top) to the screen's as
    // it is shown now: turned a quarter to the left (ROTATION_90), the screen's right is the device's bottom.
    fun screen(x: Float, y: Float, rotation: Int): Pair<Float, Float> = when (rotation) {
        Surface.ROTATION_90 -> -y to x
        Surface.ROTATION_180 -> -x to -y
        Surface.ROTATION_270 -> y to -x
        else -> x to y
    }

    private fun begin(at: Long) { reference = now.clone(); flatX = 0f; flatY = 0f; last = at }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ---- Ronda 40, «caixa d'aire sobre Valls» (Carbon's C1 with Astra's paper skyline; as iOS's Depth, Motion.swift):
    // the screen is a window on the air over Valls. A lean moves every plane by its depth: what is behind the glass goes
    // with it (clouds, the town), what is in front goes against it (the cartridges, at three depths, the first row
    // nearest; a wisp of mist). Each cartridge follows on its own spring, stiffer the nearer, so the six never move as
    // one wall, and floats a little on its own at rest. Nothing turns in 3D.
    private val ROWS = arrayOf( // travel at full lean (dp on a 393 dp screen), swing (degrees), spring pace by column (rad/s), damping
        floatArrayOf(-11.5f, -8.0f, -0.85f, 15.6f, 14.4f, 0.70f), floatArrayOf(-8.2f, -5.7f, -0.60f, 13.0f, 12.1f, 0.74f),
        floatArrayOf(-6.2f, -4.3f, -0.45f, 11.3f, 10.6f, 0.74f))
    val CLOUDS = floatArrayOf(14f, 9f); val TOWN = floatArrayOf(9f, 4.5f); val MIST = floatArrayOf(-16.5f, -11f)
    private const val CELLS = 24
    private val sx = FloatArray(CELLS); private val sy = FloatArray(CELLS); private val svx = FloatArray(CELLS); private val svy = FloatArray(CELLS)
    private var clock by mutableFloatStateOf(0f) // seconds of the grid's own motion: each frame's read invalidates the layers
    private var before = 0L

    // One frame of the six springs and the float's clock (the home's frame loop, only while the grid shows).
    fun frame(now: Long, cols: Int) {
        val dt = if (before == 0L) 0f else ((now - before) / 1e9f).coerceIn(0f, 0.05f)
        before = now
        for (i in 0 until CELLS) {
            val r = ROWS[minOf(i / cols, ROWS.size - 1)]; val w = r[3 + (i % cols) % 2]; val z = r[5]
            svx[i] += (w * w * (x - sx[i]) - 2 * z * w * svx[i]) * dt; sx[i] += svx[i] * dt
            svy[i] += (w * w * (y - sy[i]) - 2 * z * w * svy[i]) * dt; sy[i] += svy[i] * dt
        }
        clock += dt
    }
    fun rest() { before = 0L }

    // Cell i's place and swing now, for its layer: dx, dy (dp on a 393 dp screen; times u / 16.43) and degrees. `float`:
    // at rest ±2.1 dp up and down, ±0.85 sideways, ±0.32°, each on its own period (5.4 to 7 s), neighbours opposed.
    fun cell(i: Int, cols: Int, float: Boolean, out: FloatArray) {
        val k = i.coerceIn(0, CELLS - 1); val r = ROWS[minOf(k / cols, ROWS.size - 1)]
        val odd = if ((k / cols + k % cols) % 2 == 0) 1f else -1f
        val a = if (float) kotlin.math.sin(clock * 2 * Math.PI.toFloat() / (5.4f + 0.8f * (k % 3)) + k) * odd else 0f
        out[0] = sx[k] * r[0] + 0.85f * a; out[1] = sy[k] * r[1] - 2.1f * a; out[2] = sx[k] * r[2] + 0.32f * a
    }

    private const val FULL = 0.3142f // 18°: the hand's angle for the whole lean
    private const val DEAD = 0.0052f // 0.3°: a hand's tremor is not a lean
    private fun past(a: Float) = if (a > DEAD) a - DEAD else if (a < -DEAD) a + DEAD else 0f
}
