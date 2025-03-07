package sg.nus.iss.final_project.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;

@Configuration
public class GoogleCloudConfig {

    @Value("${google.cloud.credentials.location}")
    private Resource googleCredentials;

    @Bean
    public GoogleCredentials googleCredentials() throws IOException {
        return GoogleCredentials.fromStream(googleCredentials.getInputStream());
    }

    @Bean
    public ImageAnnotatorSettings imageAnnotatorSettings(GoogleCredentials credentials) throws IOException {
        return ImageAnnotatorSettings.newBuilder()
                .setCredentialsProvider(() -> credentials)
                .build();
    }
}