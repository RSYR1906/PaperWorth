package sg.nus.iss.final_project.config;

import java.io.FileInputStream;
import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;

@Configuration
public class GoogleCloudConfig {

	@Value("${google.cloud.credentials.path}")
	private String credentialsPath;

	@Bean
	public GoogleCredentials googleCredentials() throws IOException {
		try (FileInputStream inputStream = new FileInputStream(credentialsPath)) {
			return GoogleCredentials.fromStream(inputStream)
					.createScoped("https://www.googleapis.com/auth/cloud-platform");
		} catch (IOException e) {
			throw new RuntimeException("Failed to load Google Cloud credentials", e);
		}
	}

	@Bean
	public ImageAnnotatorSettings imageAnnotatorSettings(GoogleCredentials credentials) throws IOException {
		return ImageAnnotatorSettings.newBuilder()
				.setCredentialsProvider(() -> credentials)
				.build();
	}
}