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
    static let rest = "/app/rest.html"
    var onExit: (() -> Void)?
    var mayUpdate: ((String) -> Bool)? // the launcher lets a downloaded bundle (its id) in only when no game is opening (app/rest.html)
    var onRested: (() -> Void)?

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PowerPlugin())
        bridge?.registerPluginInstance(MulassaPlugin())
    }

    // It starts on the resting page, which only checks for live updates (the launcher loads each game into it), and without
    // the web splash: the launcher is what the player sees first.
    override open func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        descriptor.appStartPath = Self.rest
        var plugins = descriptor.pluginConfigurations
        var splash = plugins["SplashScreen"] as? [String: Any] ?? [:]
        splash["launchShowDuration"] = 0
        plugins["SplashScreen"] = splash
        #if DEBUG // a live-update site on the LAN over plain http (tools/app/live-server.mjs); store builds stay https only
        var updater = plugins["CapacitorUpdater"] as? [String: Any] ?? [:]
        updater["httpsOnly"] = false
        plugins["CapacitorUpdater"] = updater
        #endif
        descriptor.pluginConfigurations = plugins
        return descriptor
    }
}

// The launcher's side of the bridge: a game's way out (plassa/native.js exitGame) returns to it.
@objc(MulassaPlugin)
public class MulassaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MulassaPlugin"
    public let jsName = "Mulassa"
    public let pluginMethods: [CAPPluginMethod] = ["exitToLauncher", "mayUpdate", "rested", "liveServer"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    private var host: MulassaBridgeViewController? { bridge?.viewController as? MulassaBridgeViewController }

    @objc func exitToLauncher(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.host?.onExit?() }
        call.resolve()
    }
    @objc func mayUpdate(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        DispatchQueue.main.async { call.resolve(["ok": self.host?.mayUpdate?(id) ?? false]) }
    }
    // Debug builds only: the live-update site typed in the account sheet (Sheets.swift), over the build's; empty: the build's.
    @objc func liveServer(_ call: CAPPluginCall) {
        #if DEBUG
        call.resolve(["url": UserDefaults.standard.string(forKey: Self.server)?.trimmingCharacters(in: .whitespaces) ?? ""])
        #else
        call.resolve(["url": ""])
        #endif
    }
    static let server = "mulassa-live-server"
    @objc func rested(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.host?.onRested?() }
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
