import UIKit
import Capacitor
import FirebaseCore
import FirebaseAuth
import CapacitorFirebaseAuthentication

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Firebase must be configured here for iOS
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }

    // Handle OAuth Redirect URLs (for Google Sign-In)
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey : Any] = [:]
    ) -> Bool {
        // Handle Capacitor plugins (e.g. Firebase Auth)
        let handled = ApplicationDelegateProxy.shared.application(app, open: url, options: options)

        // Handle Firebase Authentication redirect
        if Auth.auth().canHandle(url) {
            return true
        }

        return handled
    }

    // Handle universal links (if used)
    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }

    // Optional lifecycle hooks:
    func applicationWillResignActive(_ application: UIApplication) { }
    func applicationDidEnterBackground(_ application: UIApplication) { }
    func applicationWillEnterForeground(_ application: UIApplication) { }
    func applicationDidBecomeActive(_ application: UIApplication) { }
    func applicationWillTerminate(_ application: UIApplication) { }
}
