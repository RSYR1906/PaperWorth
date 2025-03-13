package sg.nus.iss.final_project.config;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.api.gax.core.FixedCredentialsProvider;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;
import com.google.common.collect.Lists;

@Configuration
public class GoogleCloudConfig {

	@Value("${GOOGLE_CREDENTIALS}")
	private String googleCredentialsBase64;

	@Bean
	public GoogleCredentials googleCredentials() throws IOException {
		try {
			if (googleCredentialsBase64 != null && !googleCredentialsBase64.isEmpty()) {
				// Decode base64 to bytes
				byte[] decodedBytes = Base64.getDecoder().decode(googleCredentialsBase64);

				// Create credentials from decoded bytes
				return GoogleCredentials.fromStream(new ByteArrayInputStream(decodedBytes))
						.createScoped(Lists.newArrayList("https://www.googleapis.com/auth/cloud-platform"));
			} else {
				throw new IOException("No Google credentials found in environment variable");
			}
		} catch (Exception e) {
			throw new IOException("No Google credentials found", e);
		}
	}

	@Bean
	public ImageAnnotatorSettings imageAnnotatorSettings(GoogleCredentials credentials)
			throws IOException {
		return ImageAnnotatorSettings.newBuilder()
				.setCredentialsProvider(FixedCredentialsProvider.create(credentials))
				.build();
	}
}