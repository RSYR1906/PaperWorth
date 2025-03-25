import Firebase
import Foundation

@objc extension AppDelegate {
    // This needs to override the same method from the AppDelegate
    override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase first
        FirebaseApp.configure()
        
        // Then call the super implementation
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
}