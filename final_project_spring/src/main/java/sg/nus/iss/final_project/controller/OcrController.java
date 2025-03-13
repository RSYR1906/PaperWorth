package sg.nus.iss.final_project.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import sg.nus.iss.final_project.service.OcrService;

@RestController
@RequestMapping("/api/ocr")
public class OcrController {

    private final OcrService ocrService;

    public OcrController(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    @PostMapping("/scan")
    public ResponseEntity<?> scanReceipt(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> extractedData = ocrService.processReceiptImage(file);
            return ResponseEntity.ok(extractedData);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error processing image: " + e.getMessage());
        } catch (Exception e) {
            // Generic exception handling for any Google API errors
            return ResponseEntity.status(500).body("Error with Google Cloud Vision API: " + e.getMessage());
        }
    }
}