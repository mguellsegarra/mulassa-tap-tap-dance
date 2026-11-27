package cat.mulassa.games;

import android.content.Context;
import android.os.Bundle;
import cat.mulassa.games.launcher.AppLanguage;
import cat.mulassa.games.launcher.GameSession;
import cat.mulassa.games.launcher.MulassaPlugin;
import com.getcapacitor.BridgeActivity;

// The games' bridge, opened by the launcher (launcher/LauncherActivity.kt) at a game's page; leaving the game finishes it.
public class MainActivity extends BridgeActivity implements MulassaPlugin.Host {
    private final GameSession game = new GameSession(this);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PowerPlugin.class); // the app's own plugins, before the bridge starts
        registerPlugin(MulassaPlugin.class);
        config = game.config(getIntent(), savedInstanceState);
        game.window();
        super.onCreate(savedInstanceState);
        game.attach();
    }

    // the launcher's language (Catalan unless chosen), so the cover over the loading page reads as the launcher's iris did
    @Override
    protected void attachBaseContext(Context base) { super.attachBaseContext(AppLanguage.INSTANCE.wrap(base)); }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        game.save(outState);
    }

    @Override
    public void exitToLauncher() { game.exitToLauncher(); }

    // The notification shade (or any system window) over the app: the page stays visible and focused and is told nothing,
    // so it gets «nativeblur» to pause a run (native.js onAppInactive).
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus && getBridge() != null) getBridge().triggerWindowJSEvent("nativeblur");
    }
}
