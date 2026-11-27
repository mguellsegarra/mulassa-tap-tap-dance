package cat.mulassa.games.launcher

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.provider.Settings
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.setValue

// Ronda 36 (the owner: the home looked flat and still): how the phone is held, as two numbers in -1..1 (x: tipped to the
// right, y: its top tipped away), for the cartridges to lean with, their shine to cross them and the clouds to drift the
// other way. Gravity against a baseline that follows it slowly, so any way of holding the phone becomes level again in a
// few seconds. Read only inside layer and draw blocks: a new sample moves layers, it recomposes nothing. Listening while
// the launcher is in front (its onResume to onPause: never under a game), level under a picked cartridge, and off when
// the system's animations are (as iOS's Reduce Motion). The same numbers as iOS (Motion.swift).
object Tilt : SensorEventListener {
    var x by mutableFloatStateOf(0f); private set
    var y by mutableFloatStateOf(0f); private set
    var level = false // a cartridge is picked: nothing leans under it
        set(v) { field = v; if (v) { x = 0f; y = 0f } }
    private var base: FloatArray? = null
    private var held = false

    fun start(ctx: Context) {
        if (held || Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f) return
        val sensors = ctx.getSystemService(SensorManager::class.java) ?: return
        val gravity = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY) ?: sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return
        sensors.registerListener(this, gravity, SensorManager.SENSOR_DELAY_GAME)
    }

    fun stop(ctx: Context) {
        ctx.getSystemService(SensorManager::class.java)?.unregisterListener(this)
        base = null
        if (!held) { x = 0f; y = 0f }
    }

    // debug builds only (LauncherActivity's `--es tilt 0.9,-0.6`): a lean held for captures on an emulator
    fun hold(x: Float, y: Float) { held = true; this.x = x; this.y = y }

    override fun onSensorChanged(e: SensorEvent) {
        // Android reports the reaction to gravity, in g's here: negated, it is iOS's gravity vector
        val gx = -e.values[0] / SensorManager.GRAVITY_EARTH; val gy = -e.values[1] / SensorManager.GRAVITY_EARTH
        val b = base ?: floatArrayOf(gx, gy).also { base = it }
        if (level) { b[0] = gx; b[1] = gy; return }
        val tx = ((gx - b[0]) / FULL).coerceIn(-1f, 1f); val ty = ((gy - b[1]) / FULL).coerceIn(-1f, 1f)
        b[0] += (gx - b[0]) * 0.007f; b[1] += (gy - b[1]) * 0.007f // the baseline's pace: level again in ~3 s (50 samples a second)
        x += (tx - x) * 0.25f; y += (ty - y) * 0.25f // smoothed: an accelerometer without a gravity sensor shakes
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private const val FULL = 0.26f // of gravity: about 15° of the hand for the whole lean
    const val LEAN = 7f // degrees
}
