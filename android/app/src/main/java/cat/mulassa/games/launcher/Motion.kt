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
// against a reference attitude: 16° is the whole lean, eased past it. The level follows the hand slowly (6 s), so holding
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
        val slow = 1 - exp(-dt / 6f); val quick = 1 - exp(-dt / 0.045f)
        flatX += (ax - flatX) * slow; flatY += (ay - flatY) * slow
        val tx = x + (tanh((ax - flatX) / FULL) - x) * quick; val ty = y + (tanh((ay - flatY) / FULL) - y) * quick
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

    private const val FULL = 0.2793f // 16°: the hand's angle for the whole lean
    const val TURN_X = 6f; const val TURN_Y = 5f // degrees: sideways, and up and down
}
