package sg.nus.iss.final_project.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

import org.imgscalr.Scalr;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Feature.Type;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.protobuf.ByteString;

@Service
public class OcrService {

    public Map<String, Object> processReceiptImage(MultipartFile file) throws IOException {
        // Convert multipart file to buffered image for preprocessing
        BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(file.getBytes()));

        // Preprocess image for better OCR results
        BufferedImage processedImage = preprocessImage(originalImage);

        // Convert the processed image back to bytes for Google Cloud Vision
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        ImageIO.write(processedImage, "png", baos);
        byte[] imageBytes = baos.toByteArray();

        // Send to Google Cloud Vision API
        String recognizedText = detectText(imageBytes);

        // Extract relevant information
        Map<String, Object> extractedData = extractInformation(recognizedText);

        return extractedData;
    }

    private BufferedImage preprocessImage(BufferedImage original) {
        // Resize if too large
        if (original.getWidth() > 1500 || original.getHeight() > 1500) {
            original = Scalr.resize(original, Scalr.Method.QUALITY, 1500);
        }

        // Convert to grayscale - can help with text detection
        BufferedImage grayscale = Scalr.apply(original, Scalr.OP_GRAYSCALE);

        return grayscale;
    }

    private String detectText(byte[] imageBytes) throws IOException {
        // Initialize client that will be used to send requests
        // This client only needs to be created once, and can be reused for multiple
        // requests
        try (ImageAnnotatorClient vision = ImageAnnotatorClient.create()) {
            ByteString imgBytes = ByteString.copyFrom(imageBytes);

            // Create image object
            Image image = Image.newBuilder().setContent(imgBytes).build();

            // Create feature object
            Feature feature = Feature.newBuilder().setType(Type.TEXT_DETECTION).build();

            // Create the request object
            AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                    .addFeatures(feature)
                    .setImage(image)
                    .build();

            // Add the request to the list of requests
            List<AnnotateImageRequest> requests = new ArrayList<>();
            requests.add(request);

            // Send the request and get response
            BatchAnnotateImagesResponse response = vision.batchAnnotateImages(requests);
            List<AnnotateImageResponse> responses = response.getResponsesList();

            StringBuilder fullText = new StringBuilder();

            for (AnnotateImageResponse res : responses) {
                if (res.hasError()) {
                    System.out.format("Error: %s%n", res.getError().getMessage());
                    return "Error: " + res.getError().getMessage();
                }

                // Get the full text annotation (this gives us all the text in the image)
                String text = res.getTextAnnotations(0).getDescription();
                fullText.append(text);
            }

            return fullText.toString();
        }
    }

    private Map<String, Object> extractInformation(String ocrText) {
        Map<String, Object> data = new HashMap<>();

        // Set full text
        data.put("fullText", ocrText);

        // Extract merchant name (usually at the top of receipt)
        String merchantName = extractMerchantName(ocrText);
        data.put("merchantName", merchantName);

        // Extract total amount
        Double totalAmount = extractTotalAmount(ocrText);
        data.put("totalAmount", totalAmount);

        // Extract date
        String date = extractDate(ocrText);
        data.put("date", date);

        return data;
    }

    private String extractMerchantName(String text) {
        String[] lines = text.split("\\n");
        if (lines.length > 0) {
            // Skip any initial blank lines
            int startIdx = 0;
            while (startIdx < lines.length && lines[startIdx].trim().isEmpty()) {
                startIdx++;
            }

            // Return first non-empty line
            if (startIdx < lines.length) {
                return lines[startIdx].trim();
            }
        }
        return "Unknown Merchant";
    }

    private Double extractTotalAmount(String text) {
        // Look for patterns like "TOTAL: $XX.XX" or "TOTAL $XX.XX"
        Pattern pattern = Pattern.compile("(?i)\\b(TOTAL|AMOUNT|SUM|DUE)\\s*:?\\s*\\$?\\s*(\\d+[.,]\\d{2})");
        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            String amount = matcher.group(2).replace(",", ".");
            try {
                return Double.parseDouble(amount);
            } catch (NumberFormatException e) {
                // Handle parsing error
            }
        }

        // Try additional patterns
        Pattern pattern2 = Pattern.compile("(?i)\\$(\\d+[.,]\\d{2})\\s*\\b(TOTAL|AMOUNT|SUM|DUE)");
        Matcher matcher2 = pattern2.matcher(text);

        if (matcher2.find()) {
            String amount = matcher2.group(1).replace(",", ".");
            try {
                return Double.parseDouble(amount);
            } catch (NumberFormatException e) {
                // Handle parsing error
            }
        }

        return 0.0;
    }

    private String extractDate(String text) {
        // Look for common date formats
        Pattern pattern = Pattern.compile("(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})");
        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            return matcher.group(1);
        }

        // Try another common format (yyyy-mm-dd)
        Pattern pattern2 = Pattern.compile("(\\d{4}[/.-]\\d{1,2}[/.-]\\d{1,2})");
        Matcher matcher2 = pattern2.matcher(text);

        if (matcher2.find()) {
            return matcher2.group(1);
        }

        return "Unknown Date";
    }
}