package sg.nus.iss.final_project.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;

import jakarta.annotation.PostConstruct;

@Service
public class GoogleVisionTest {

    @Autowired
    private ImageAnnotatorSettings imageAnnotatorSettings;

    @PostConstruct
    public void testVisionAPI() {
        try (ImageAnnotatorClient vision = ImageAnnotatorClient.create(imageAnnotatorSettings)) {
            System.out.println("✅ Google Vision API is working correctly!");
        } catch (Exception e) {
            System.err.println("❌ Google Vision API test failed: " + e.getMessage());
        }
    }
}