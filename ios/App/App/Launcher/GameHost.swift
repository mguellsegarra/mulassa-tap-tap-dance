import SwiftUI
import Capacitor

// The app's root (docs/app/native-shell.md, «Navigation»): the SwiftUI launcher, with the one game bridge kept warm behind it.
// A game opens in that bridge, presented full screen under the iris; Mulassa.exitToLauncher() brings the launcher back.
final class LauncherController: UIHostingController<LauncherRoot> {
    private let model: Launcher
    private let iris = IrisState()
    private let bridgeVC = MulassaBridgeViewController()
    private var irisWindow: UIWindow?
    private var splashWindow: UIWindow?
    private var busy = false
    private var loading: NSKeyValueObservation?

    init() {
        model = Launcher()
        super.init(rootView: LauncherRoot(model: model))
        bridgeVC.modalPresentationStyle = .fullScreen
        bridgeVC.onExit = { [weak self] in self?.exitGame() }
        // Loading the bridge's view loads its plugins: Capgo picks the active bundle there, which the launcher then reads.
        bridgeVC.loadViewIfNeeded()
        WebBundle.registerFonts(from: bundleRoot)
        model.load(root: bundleRoot)
        model.play = { [weak self] game, from in self?.play(game, from: from) }
    }

    @MainActor required dynamic init?(coder: NSCoder) { fatalError("built in code") }

    // Cold start: the walking Mulassa (Splash.swift), continuing the launch screen, then a fade. In its own window from
    // the first frame (a subview of this hosting view ends up under SwiftUI's content).
    override func viewIsAppearing(_ animated: Bool) {
        super.viewIsAppearing(animated)
        guard !Splash.shown, let scene = view.window?.windowScene else { return }
        Splash.shown = true
        let w = UIWindow(windowScene: scene)
        w.windowLevel = .normal + 2 // over the iris's window too
        w.rootViewController = SplashHost(still: UIAccessibility.isReduceMotionEnabled) { [weak self] in
            UIView.animate(withDuration: Splash.fade, animations: { self?.splashWindow?.alpha = 0 }) { _ in
                self?.splashWindow?.isHidden = true
                self?.splashWindow = nil
            }
        }
        w.isHidden = false // shown, never key: it swallows the taps until it has faded
        splashWindow = w
    }

    private var bundleRoot: URL {
        let path = bridgeVC.getServerBasePath()
        return path.isEmpty ? WebBundle.builtin : URL(fileURLWithPath: path)
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        traitCollection.userInterfaceIdiom == .pad ? .all : .portrait
    }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func play(_ game: Game, from: CGPoint) {
        guard !busy, !game.soon, let path = game.path, WebBundle.isEntryPath(path),
              let server = bridgeVC.bridge?.config.serverURL, let url = URL(string: path, relativeTo: server) else { return }
        busy = true
        showIris(game, from: from)
        iris.forward { [weak self] in
            guard let self else { return }
            bridgeVC.webView?.load(URLRequest(url: url))
            present(bridgeVC, animated: false) { self.liftIrisWhenLoaded() }
        }
    }

    // The iris stays over the game until its page has loaded (at most 3 s), so the web view's start never shows.
    private func liftIrisWhenLoaded() {
        var lifted = false
        let lift = { [weak self] in
            guard let self, !lifted else { return }
            lifted = true
            loading = nil
            UIView.animate(withDuration: 0.25, animations: { self.irisWindow?.alpha = 0 }) { _ in
                self.irisWindow?.isHidden = true
                self.iris.hop = false
                self.busy = false
            }
        }
        loading = bridgeVC.webView?.observe(\.isLoading, options: [.initial, .new]) { web, _ in
            if !web.isLoading { DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { lift() } }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { lift() }
    }

    private func exitGame() {
        guard presentedViewController === bridgeVC, let game = iris.game else { return }
        busy = true
        showIris(game, from: iris.origin)
        iris.backward { [weak self] in
            self?.irisWindow?.isHidden = true
            self?.busy = false
        }
        dismiss(animated: false) { [weak self] in
            guard let self else { return }
            // the page is stopped (its music, its frames) by loading the bundle's catalogue, a page with no script
            if let server = bridgeVC.bridge?.config.serverURL, let quiet = URL(string: "/catalogue.json", relativeTo: server) {
                bridgeVC.webView?.load(URLRequest(url: quiet))
            }
            model.load(root: bundleRoot) // a live update applied in the game switched the bundle
        }
    }

    private func showIris(_ game: Game, from: CGPoint) {
        if irisWindow == nil, let scene = view.window?.windowScene {
            let w = UIWindow(windowScene: scene)
            w.windowLevel = .normal + 1
            w.backgroundColor = .clear
            let host = IrisHost(rootView: IrisView(state: iris))
            host.view.backgroundColor = .clear
            w.rootViewController = host
            irisWindow = w
        }
        iris.game = game
        iris.image = model.images[game.id]
        iris.origin = from
        irisWindow?.alpha = 1
        irisWindow?.isHidden = false // shown, never key: it takes the taps while it plays, so nothing opens twice
    }
}

// Until SwiftUI's first draw (up to a second into a cold start) the window shows the launch screen's own picture, never empty.
private final class SplashHost: UIViewController {
    private let clock = SplashClock()
    private let walk: UIHostingController<SplashView>
    private let done: () -> Void
    private var link: CADisplayLink?, start: CFTimeInterval = 0, faded = false

    init(still: Bool, done: @escaping () -> Void) {
        self.done = done
        walk = UIHostingController(rootView: SplashView(still: still, clock: clock))
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("built in code") }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        link = CADisplayLink(target: self, selector: #selector(tick))
        link?.add(to: .main, forMode: .common)
    }
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        link?.invalidate()
    }
    @objc private func tick(_ l: CADisplayLink) {
        // the system keeps its launch picture up until the scene is active, so the walk (and the blend from rest) starts then
        if start == 0 { guard view.window?.windowScene?.activationState == .foregroundActive else { return }; start = l.timestamp }
        clock.t = l.timestamp - start
        if !faded, clock.t >= Splash.hold { faded = true; done() } // the catalogue was read before the first frame
        if view.window?.isHidden ?? true { l.invalidate() }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        let bg = SplashArt.background
        view.backgroundColor = UIColor(red: CGFloat(bg >> 16) / 255, green: CGFloat(bg >> 8 & 255) / 255, blue: CGFloat(bg & 255) / 255, alpha: 1)
        let rest = UIImageView(image: UIImage(named: "Splash"))
        rest.contentMode = .center
        walk.view.backgroundColor = .clear
        for v in [rest, walk.view!] {
            v.frame = view.bounds
            v.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(v)
        }
        addChild(walk)
        walk.didMove(toParent: self)
    }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        traitCollection.userInterfaceIdiom == .pad ? .all : .portrait
    }
}

private final class IrisHost: UIHostingController<IrisView> {
    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }
}
