package sg.nus.iss.final_project.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.User;
import sg.nus.iss.final_project.repo.UserRepository;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200") // Enable CORS for frontend
public class FirebaseAuthController {

    @Autowired
    private UserRepository userRepo;

    @PostMapping("/firebase-auth")
    public ResponseEntity<?> firebaseAuthentication(@RequestBody Map<String, String> payload) {
        // Extract user data from payload
        String firebaseId = payload.get("firebaseId");
        String email = payload.get("email");
        String name = payload.get("name");

        // Validate required fields
        if (firebaseId == null || email == null) {
            return ResponseEntity.badRequest().body("Firebase ID and email are required");
        }

        try {
            // Check if user with this Firebase ID already exists
            Optional<User> existingUserByFirebaseId = findUserByFirebaseId(firebaseId);

            if (existingUserByFirebaseId.isPresent()) {
                // User exists, return user data
                User user = existingUserByFirebaseId.get();

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

                    // Update the existing user with the Firebase ID
                    user.setFirebaseId(firebaseId);
                    if (name != null && !name.isEmpty()) {
                        user.setName(name); // Update name if provided
                    }

                    // Update user in the database
                    userRepo.updateFirebaseId(user.getId(), firebaseId);

                    Map<String, Object> response = new HashMap<>();
                    response.put("id", user.getId());
                    response.put("name", user.getName());
                    response.put("email", user.getEmail());
                    response.put("createdAt", user.getCreatedAt());

                    return ResponseEntity.ok(response);
                } else {
                    // Create new user
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(name != null && !name.isEmpty() ? name : "User");
                    newUser.setFirebaseId(firebaseId);
                    // Set a placeholder password hash since we're using Firebase Auth
                    newUser.setPasswordHash("firebase-auth-" + firebaseId);

                    // Save user
                    int result = userRepo.save(newUser);

                    if (result > 0) {
                        // Fetch the user to get the ID
                        Optional<User> createdUser = userRepo.findByEmail(email);

                        if (createdUser.isPresent()) {
                            User user = createdUser.get();

                            Map<String, Object> response = new HashMap<>();
                            response.put("id", user.getId());
                            response.put("name", user.getName());
                            response.put("email", user.getEmail());
                            response.put("createdAt", user.getCreatedAt());

                            return ResponseEntity.ok(response);
                        }
                    }

                    // If we get here, something went wrong
                    return ResponseEntity.status(500).body("Failed to create user");
                }
            }
        } catch (DuplicateKeyException e) {
            // Handle the case where there's a race condition with email uniqueness
            Optional<User> userByEmail = userRepo.findByEmail(email);

            if (userByEmail.isPresent()) {
                User user = userByEmail.get();

                // Update the Firebase ID for this user
                userRepo.updateFirebaseId(user.getId(), firebaseId);

                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("name", user.getName());
                response.put("email", user.getEmail());
                response.put("createdAt", user.getCreatedAt());

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(500).body("Error handling existing email: " + e.getMessage());
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error processing request: " + e.getMessage());
        }
    }

    // Helper method to find user by Firebase ID
    private Optional<User> findUserByFirebaseId(String firebaseId) {
        try {
            return userRepo.findByFirebaseId(firebaseId);
        } catch (Exception e) {
            // Handle any errors gracefully
            return Optional.empty();
        }
    }
}