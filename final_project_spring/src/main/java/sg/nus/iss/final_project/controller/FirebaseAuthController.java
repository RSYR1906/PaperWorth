package sg.nus.iss.final_project.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

import sg.nus.iss.final_project.model.User;
import sg.nus.iss.final_project.repo.UserRepository;

@RestController
@RequestMapping("/api/users")
public class FirebaseAuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private FirebaseAuth firebaseAuth;

    @PostMapping("/firebase-auth")
    public ResponseEntity<?> firebaseAuthentication(@RequestBody Map<String, String> payload) {
        // Extract user data from payload
        String firebaseId = payload.get("firebaseId");
        String email = payload.get("email");
        String name = payload.get("name");
        String idToken = payload.get("idToken");

        // Debug logs for incoming request data
        System.out.println("==== Firebase Auth Request ====");
        System.out.println("firebaseId: " + firebaseId);
        System.out.println("email: " + email);
        System.out.println("name: '" + name + "'");
        System.out.println("name is null: " + (name == null));
        System.out.println("name is empty: " + (name != null && name.isEmpty()));
        System.out.println("===========================");

        // Validate required fields
        if (firebaseId == null || email == null) {
            System.out.println("ERROR: Firebase ID or email is missing");
            return ResponseEntity.badRequest().body("Firebase ID and email are required");
        }

        try {

            // Verify the ID token
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(idToken);
            String uid = decodedToken.getUid();

            // Check if the UID in the token matches the provided Firebase ID
            if (!uid.equals(firebaseId)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid ID token");
            }

            // Check if user with this Firebase ID already exists
            Optional<User> existingUserByFirebaseId = findUserByFirebaseId(firebaseId);

            if (existingUserByFirebaseId.isPresent()) {
                // User exists, update the name if provided
                User user = existingUserByFirebaseId.get();
                System.out.println(
                        "Found existing user by Firebase ID: " + user.getId() + " with name: '" + user.getName() + "'");

                // THIS IS THE KEY FIX: Always update the name if it's provided and different
                if (name != null && !name.isEmpty() && !name.equals(user.getName())) {
                    System.out.println("Updating existing user name from '" + user.getName() + "' to '" + name + "'");
                    user.setName(name);
                    userRepo.updateUserWithFirebase(user.getId(), firebaseId, name);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("name", user.getName());
                response.put("email", user.getEmail());
                response.put("createdAt", user.getCreatedAt());

                return ResponseEntity.ok(response);
            } else {
                // User doesn't exist by Firebase ID, check if email exists
                Optional<User> userByEmail = userRepo.findByEmail(email);

                if (userByEmail.isPresent()) {
                    // User with email exists, link Firebase ID to this user
                    User user = userByEmail.get();
                    System.out.println(
                            "Found existing user by email: " + user.getId() + " with name: '" + user.getName() + "'");

                    // Update the existing user with the Firebase ID and name
                    user.setFirebaseId(firebaseId);
                    // SIMILAR FIX HERE: Always update name if provided and different
                    if (name != null && !name.isEmpty() && !name.equals(user.getName())) {
                        System.out.println("Updating user name from '" + user.getName() + "' to '" + name + "'");
                        user.setName(name);
                        userRepo.updateUserWithFirebase(user.getId(), firebaseId, name);
                    } else {
                        System.out.println(
                                "Name is null, empty, or unchanged, keeping existing name: '" + user.getName() + "'");
                        userRepo.updateFirebaseId(user.getId(), firebaseId);
                    }

                    Map<String, Object> response = new HashMap<>();
                    response.put("id", user.getId());
                    response.put("name", user.getName());
                    response.put("email", user.getEmail());
                    response.put("createdAt", user.getCreatedAt());

                    return ResponseEntity.ok(response);
                } else {
                    // Create new user
                    System.out.println("Creating new user with email: " + email);
                    String finalName = name != null && !name.isEmpty() ? name : "User";
                    System.out.println("Setting name to: '" + finalName + "'");

                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(finalName);
                    newUser.setFirebaseId(firebaseId);
                    // Set a placeholder password hash since we're using Firebase Auth
                    newUser.setPasswordHash("firebase-auth-" + firebaseId);

                    // Save user
                    int result = userRepo.save(newUser);
                    System.out.println("User save result: " + result);

                    if (result > 0) {
                        // Fetch the user to get the ID
                        Optional<User> createdUser = userRepo.findByEmail(email);

                        if (createdUser.isPresent()) {
                            User user = createdUser.get();
                            System.out.println("Created user successfully. ID: " + user.getId() + ", Name: '"
                                    + user.getName() + "'");

                            Map<String, Object> response = new HashMap<>();
                            response.put("id", user.getId());
                            response.put("name", user.getName());
                            response.put("email", user.getEmail());
                            response.put("createdAt", user.getCreatedAt());

                            return ResponseEntity.ok(response);
                        } else {
                            System.out.println("ERROR: Couldn't find created user by email: " + email);
                        }
                    } else {
                        System.out.println("ERROR: Failed to save user, result = " + result);
                    }

                    // If we get here, something went wrong
                    return ResponseEntity.status(500).body("Failed to create user");
                }
            }
        } catch (DuplicateKeyException e) {
            // Handle the case where there's a race condition with email uniqueness
            System.out.println("DuplicateKeyException: " + e.getMessage());
            Optional<User> userByEmail = userRepo.findByEmail(email);

            if (userByEmail.isPresent()) {
                User user = userByEmail.get();
                System.out.println("Found existing user by email after DuplicateKeyException: " + user.getId());

                // Update the Firebase ID for this user
                // SIMILAR FIX: Always update name if provided
                if (name != null && !name.isEmpty() && !name.equals(user.getName())) {
                    System.out.println(
                            "Updating user name after duplicate key from '" + user.getName() + "' to '" + name + "'");
                    user.setName(name);
                    userRepo.updateUserWithFirebase(user.getId(), firebaseId, name);
                } else {
                    userRepo.updateFirebaseId(user.getId(), firebaseId);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("name", user.getName());
                response.put("email", user.getEmail());
                response.put("createdAt", user.getCreatedAt());

                return ResponseEntity.ok(response);
            } else {
                System.out.println("ERROR: Couldn't find user by email after DuplicateKeyException: " + email);
                return ResponseEntity.status(500).body("Error handling existing email: " + e.getMessage());
            }
        } catch (FirebaseAuthException e) {
            System.out.println("ERROR: Token verification failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token verification failed: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("ERROR: Unexpected exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error processing request: " + e.getMessage());
        }
    }

    // Helper method to find user by Firebase ID
    private Optional<User> findUserByFirebaseId(String firebaseId) {
        try {
            Optional<User> user = userRepo.findByFirebaseId(firebaseId);
            System.out.println("findUserByFirebaseId: " + (user.isPresent() ? "found" : "not found"));
            return user;
        } catch (Exception e) {
            // Handle any errors gracefully
            System.out.println("ERROR in findUserByFirebaseId: " + e.getMessage());
            return Optional.empty();
        }
    }
}