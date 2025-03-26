package sg.nus.iss.final_project.config;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.api.gax.core.FixedCredentialsProvider;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;
import com.google.common.collect.Lists;

@Configuration
public class GoogleCloudConfig {

	private static final Logger logger = LoggerFactory.getLogger(GoogleCloudConfig.class);

	@Value("${GOOGLE_APPLICATION_CREDENTIALS:}")
	private String googleCredentials;

	@Bean
	public GoogleCredentials googleCredentials() throws IOException {
		try {
			if (googleCredentials != null && !googleCredentials.isEmpty()) {
				if (googleCredentials.startsWith("{") || googleCredentials.trim().startsWith("{")) {
					logger.info("Using direct JSON credential string");
					return GoogleCredentials.fromStream(new ByteArrayInputStream(googleCredentials.getBytes()))
							.createScoped(Lists.newArrayList("https://www.googleapis.com/auth/cloud-platform"));
				} else if (Files.exists(Paths.get(googleCredentials))) {
					logger.info("Loading credentials from file: {}", googleCredentials);
					try (InputStream credentialsStream = new FileInputStream(googleCredentials)) {
						return GoogleCredentials.fromStream(credentialsStream)
								.createScoped(Lists.newArrayList("https://www.googleapis.com/auth/cloud-platform"));
					}
				} else {
					try {
						logger.info("Attempting to decode Base64 credentials");
						byte[] decodedBytes = Base64.getDecoder().decode(googleCredentials);
						return GoogleCredentials.fromStream(new ByteArrayInputStream(decodedBytes))
								.createScoped(Lists.newArrayList("https://www.googleapis.com/auth/cloud-platform"));
					} catch (IllegalArgumentException e) {
						logger.error("Invalid Base64 or file path: {}", googleCredentials);
						throw new IOException("Google credentials format not recognized", e);
					}
				}
			}
			logger.error("No Google credentials found");
			throw new IOException("No Google credentials found");
		} catch (Exception e) {
			logger.error("Error creating Google credentials", e);
			throw new IOException("Error creating Google credentials", e);
		}
	}

	@Bean
	public ImageAnnotatorSettings imageAnnotatorSettings(GoogleCredentials credentials) throws IOException {
		try {
			logger.info("Creating ImageAnnotatorSettings with credentials");
			return ImageAnnotatorSettings.newBuilder()
					.setCredentialsProvider(FixedCredentialsProvider.create(credentials))
					.build();
		} catch (Exception e) {
			logger.error("Error creating ImageAnnotatorSettings", e);
			throw new IOException("Error creating ImageAnnotatorSettings", e);
		}
	}
}