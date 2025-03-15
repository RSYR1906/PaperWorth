package sg.nus.iss.final_project.controller;

import java.io.IOException;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import sg.nus.iss.final_project.service.OcrService;

@RestController
@RequestMapping("/api/ocr")
public class OcrController {
    private static final Logger logger = LoggerFactory.getLogger(OcrController.class);

    private final OcrService ocrService;

    public OcrController(OcrService ocrService) {
        this.ocrService = ocrService;
        logger.info("OcrController initialized");
    }

    @PostMapping("/scan")
    public ResponseEntity<?> scanReceipt(@RequestParam("file") MultipartFile file) {
        logger.info("Received OCR scan request. File name: {}, size: {} bytes",
                file.getOriginalFilename(), file.getSize());

        try {
            logger.debug("File content type: {}", file.getContentType());

            if (file.isEmpty()) {
                logger.error("Empty file received");
                return ResponseEntity.badRequest().body("Empty file");
            }

            logger.info("Starting OCR processing");
            Map<String, Object> extractedData = ocrService.processReceiptImage(file);
            logger.info("OCR processing completed successfully");
            logger.debug("Extracted data: {}", extractedData);

            return ResponseEntity.ok(extractedData);
        } catch (IOException e) {
            logger.error("IOException during image processing", e);
            return ResponseEntity.status(500).body("Error processing image: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error during OCR processing", e);
            return ResponseEntity.status(500).body("Error with OCR processing: " + e.getMessage());
        }
    }
}