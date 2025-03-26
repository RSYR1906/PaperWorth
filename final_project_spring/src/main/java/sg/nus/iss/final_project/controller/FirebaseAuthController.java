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
        String firebaseId = payload.get("firebaseId");
        String email = payload.get("email");
        String name = payload.get("name");
        String idToken = payload.get("idToken");

        System.out.println("==== Firebase Auth Request ====");
        System.out.println("firebaseId: " + firebaseId);
        System.out.println("email: " + email);
        System.out.println("name: '" + name + "'");
        System.out.println("name is null: " + (name == null));
        System.out.println("name is empty: " + (name != null && name.isEmpty()));
        System.out.println("===========================");

        if (firebaseId == null || email == null) {
            System.out.println("ERROR: Firebase ID or email is missing");
            return ResponseEntity.badRequest().body("Firebase ID and email are required");
        }

        try {
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(idToken);
            String uid = decodedToken.getUid();

            if (!uid.equals(firebaseId)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid ID token");
            }

            Optional<User> existingUserByFirebaseId = findUserByFirebaseId(firebaseId);

            if (existingUserByFirebaseId.isPresent()) {
                User user = existingUserByFirebaseId.get();
                System.out.println(
                        "Found existing user by Firebase ID: " + user.getId() + " with name: '" + user.getName() + "'");

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
                Optional<User> userByEmail = userRepo.findByEmail(email);

                if (userByEmail.isPresent()) {
                    User user = userByEmail.get();
                    System.out.println(
                            "Found existing user by email: " + user.getId() + " with name: '" + user.getName() + "'");

                    user.setFirebaseId(firebaseId);
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
                    System.out.println("Creating new user with email: " + email);
                    String finalName = name != null && !name.isEmpty() ? name : "User";
                    System.out.println("Setting name to: '" + finalName + "'");

                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(finalName);
                    newUser.setFirebaseId(firebaseId);
                    newUser.setPasswordHash("firebase-auth-" + firebaseId);

                    int result = userRepo.save(newUser);
                    System.out.println("User save result: " + result);

                    if (result > 0) {
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
                    return ResponseEntity.status(500).body("Failed to create user");
                }
            }
        } catch (DuplicateKeyException e) {
            System.out.println("DuplicateKeyException: " + e.getMessage());
            Optional<User> userByEmail = userRepo.findByEmail(email);

            if (userByEmail.isPresent()) {
                User user = userByEmail.get();
                System.out.println("Found existing user by email after DuplicateKeyException: " + user.getId());

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

    private Optional<User> findUserByFirebaseId(String firebaseId) {
        try {
            Optional<User> user = userRepo.findByFirebaseId(firebaseId);
            System.out.println("findUserByFirebaseId: " + (user.isPresent() ? "found" : "not found"));
            return user;
        } catch (Exception e) {
            System.out.println("ERROR in findUserByFirebaseId: " + e.getMessage());
            return Optional.empty();
        }
    }
}