package cat.mulassa.games;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PowerPlugin.class); // the app's own plugins, before the bridge starts
        super.onCreate(savedInstanceState);
    }

    // The notification shade (or any system window) over the app: the page stays visible and focused and is told nothing,
    // so it gets «nativeblur» to pause a run (native.js onAppInactive).
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus && getBridge() != null) getBridge().triggerWindowJSEvent("nativeblur");
    }
}
