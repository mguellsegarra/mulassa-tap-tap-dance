import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MulassaBridgeViewController()
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

// The app's own plugins, registered on its bridge (here, not in a file of their own: no Xcode project change).
class MulassaBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PowerPlugin())
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
