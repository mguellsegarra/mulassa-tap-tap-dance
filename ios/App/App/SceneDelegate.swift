import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = LauncherController() // Launcher/GameHost.swift: the games open from it
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// The games' bridge, kept warm by the launcher, with the app's own plugins registered on it.
class MulassaBridgeViewController: CAPBridgeViewController {
    var onExit: (() -> Void)?

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PowerPlugin())
        bridge?.registerPluginInstance(MulassaPlugin())
    }

    // It starts on a page with no script (the launcher loads each game into it) and without the web splash: the
    // launcher is what the player sees first.
    override open func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        descriptor.appStartPath = "/catalogue.json"
        var plugins = descriptor.pluginConfigurations
        var splash = plugins["SplashScreen"] as? [String: Any] ?? [:]
        splash["launchShowDuration"] = 0
        plugins["SplashScreen"] = splash
        descriptor.pluginConfigurations = plugins
        return descriptor
    }
}

// The launcher's side of the bridge: a game's way out (plassa/native.js exitGame) returns to it.
@objc(MulassaPlugin)
public class MulassaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MulassaPlugin"
    public let jsName = "Mulassa"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "exitToLauncher", returnType: CAPPluginReturnPromise)]

    @objc func exitToLauncher(_ call: CAPPluginCall) {
        DispatchQueue.main.async { (self.bridge?.viewController as? MulassaBridgeViewController)?.onExit?() }
        call.resolve()
    }
}

// Low Power Mode, which the page can only guess from its frames dropping to 30 (render-quality.js): asked at start, then told.
@objc(PowerPlugin)
public class PowerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PowerPlugin"
    public let jsName = "Power"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "isLowPower", returnType: CAPPluginReturnPromise)]
    private var lowPower: Bool { ProcessInfo.processInfo.isLowPowerModeEnabled }

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(changed), name: .NSProcessInfoPowerStateDidChange, object: nil)
    }
    @objc private func changed() {
        notifyListeners("change", data: ["lowPower": lowPower])
    }
    @objc func isLowPower(_ call: CAPPluginCall) {
        call.resolve(["lowPower": lowPower])
    }
}
