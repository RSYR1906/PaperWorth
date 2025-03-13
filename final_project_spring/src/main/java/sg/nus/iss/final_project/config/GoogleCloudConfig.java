package sg.nus.iss.final_project.config;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

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
		// First check if credentials file exists
		File credentialsFile = new File(credentialsPath);
		if (credentialsFile.exists()) {
			try (FileInputStream inputStream = new FileInputStream(credentialsFile)) {
				return GoogleCredentials.fromStream(inputStream)
						.createScoped("https://www.googleapis.com/auth/cloud-platform");
			}
		} else {
			// Fallback to environment variable if file doesn't exist
			String encodedCredentials = System.getenv("GOOGLE_CREDENTIALS");
			if (encodedCredentials != null && !encodedCredentials.isEmpty()) {
				byte[] decodedCredentials = Base64.getDecoder().decode(encodedCredentials);
				try (InputStream inputStream = new ByteArrayInputStream(decodedCredentials)) {
					return GoogleCredentials.fromStream(inputStream)
							.createScoped("https://www.googleapis.com/auth/cloud-platform");
				}
			}
			throw new IOException("No Google credentials found");
		}
	}

	@Bean
	public ImageAnnotatorSettings imageAnnotatorSettings(GoogleCredentials credentials) throws IOException {
		return ImageAnnotatorSettings.newBuilder()
				.setCredentialsProvider(() -> credentials)
				.build();
	}
}