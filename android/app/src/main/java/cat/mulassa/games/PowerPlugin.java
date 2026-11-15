package cat.mulassa.games;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Battery Saver, which the page cannot see at all: asked at start, then told when it changes.
@CapacitorPlugin(name = "Power")
public class PowerPlugin extends Plugin {
    private BroadcastReceiver receiver;

    private JSObject state() {
        JSObject data = new JSObject();
        data.put("lowPower", ((PowerManager) getContext().getSystemService(Context.POWER_SERVICE)).isPowerSaveMode());
        return data;
    }

    @Override
    public void load() {
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) { notifyListeners("change", state()); }
        };
        ContextCompat.registerReceiver(getContext(), receiver, new IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() { getContext().unregisterReceiver(receiver); }

    @PluginMethod
    public void isLowPower(PluginCall call) { call.resolve(state()); }
}
