package sg.nus.iss.final_project.config;

import javax.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.cloud.vision.v1.*;

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