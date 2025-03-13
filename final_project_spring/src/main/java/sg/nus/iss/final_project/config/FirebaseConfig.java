package sg.nus.iss.final_project.config;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;

import jakarta.annotation.Resource;

@Configuration
public class FirebaseConfig {

    @Value("${FIREBASE_CREDENTIALS:}")
    private String firebaseCredentialsBase64;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            if (firebaseCredentialsBase64 != null && !firebaseCredentialsBase64.isEmpty()) {
                // Decode base64 to bytes
                byte[] decodedBytes = Base64.getDecoder().decode(firebaseCredentialsBase64);

                // Create credentials from decoded bytes
                GoogleCredentials credentials = GoogleCredentials.fromStream(
                        new ByteArrayInputStream(decodedBytes));

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();

                return FirebaseApp.initializeApp(options);
            } else {
                // Try to load from classpath for local development
                try {
                    Resource resource = (Resource) new ClassPathResource("firebase-service-account.json");
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(((ClassPathResource) resource).getInputStream()))
                            .build();

                    return FirebaseApp.initializeApp(options);
                } catch (Exception e) {
                    throw new IOException(
                            "Firebase credentials not provided. Either set FIREBASE_CREDENTIALS environment variable or include firebase-service-account.json in classpath.");
                }
            }
        } else {
            return FirebaseApp.getInstance();
        }
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}