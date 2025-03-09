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

        // Try to determine category based on merchant name
        String category = determineCategory(merchantName);
        data.put("category", category);

        // Try to extract items (this is challenging with OCR)
        List<Map<String, Object>> items = extractItems(ocrText);
        if (!items.isEmpty()) {
            data.put("items", items);
        }

        return data;
    }

    private String extractMerchantName(String text) {
        String[] lines = text.split("\\n");

        // Check first few lines for known merchant patterns
        for (int i = 0; i < Math.min(5, lines.length); i++) {
            String line = lines[i].trim().toLowerCase();
            // Check against known merchant names
            if (line.contains("cold storage") || line.contains("fairprice") ||
                    line.contains("ntuc") || line.contains("mcdonald") /* add more */) {
                return lines[i].trim();
            }
        }

        // Fallback to first non-empty line
        for (int i = 0; i < lines.length; i++) {
            if (!lines[i].trim().isEmpty()) {
                return lines[i].trim();
            }
        }

        return "Unknown Merchant";
    }

    private Double extractTotalAmount(String text) {

        String[] lines = text.split("\\n");
        for (int i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
            String line = lines[i].toLowerCase();
            if (line.contains("total") && !line.contains("subtotal")) {
                Pattern amountPattern = Pattern.compile("\\$(\\d+\\.\\d{2})");
                Matcher matcher = amountPattern.matcher(line);
                if (matcher.find()) {
                    try {
                        return Double.parseDouble(matcher.group(1));
                    } catch (NumberFormatException e) {
                        // Continue checking
                    }
                }
            }
        }

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

        Pattern dateLinePattern = Pattern
                .compile("(?i)\\b(date|date of purchase|txn date)\\s*:?\\s*(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})");
        Matcher dateLineMatcher = dateLinePattern.matcher(text);
        if (dateLineMatcher.find()) {
            return dateLineMatcher.group(2);
        }

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

    private String determineCategory(String merchantName) {
        if (merchantName == null) {
            return "Others";
        }

        // Clean the merchant name - remove spaces and convert to lowercase
        String cleanName = merchantName.toLowerCase().replaceAll("\\s+", "");

        // Grocery stores
        if (cleanName.contains("coldstorage") ||
                cleanName.contains("fairprice") ||
                cleanName.contains("ntuc") ||
                cleanName.contains("giant") ||
                cleanName.contains("shengsiong")) {
            return "Groceries";
        }

        // Fast food
        if (cleanName.contains("mcdonald") ||
                cleanName.contains("burgerking") ||
                cleanName.contains("kfc") ||
                cleanName.contains("subway") ||
                cleanName.contains("wingstop") ||
                cleanName.contains("wing") ||
                cleanName.contains("jollibee")) {
            return "Fast Food";
        }

        // Cafes
        if (cleanName.contains("starbucks") ||
                cleanName.contains("coffeebean") ||
                cleanName.contains("toastbox") ||
                cleanName.contains("yakun") ||
                cleanName.contains("cafe")) {
            return "Cafes";
        }

        // Retail
        if (cleanName.contains("uniqlo") ||
                cleanName.contains("zara") ||
                cleanName.contains("hm") ||
                cleanName.contains("cottonon")) {
            return "Retail";
        }

        // Healthcare
        if (cleanName.contains("guardian") ||
                cleanName.contains("watsons") ||
                cleanName.contains("unity") ||
                cleanName.contains("pharmacy")) {
            return "Healthcare";
        }

        // Add a debug log to see what merchant name is being processed
        System.out.println("Merchant name not categorized: " + merchantName + " (cleaned: " + cleanName + ")");

        // Default to "Others" if no match
        return "Others";
    }

    private List<Map<String, Object>> extractItems(String text) {
        List<Map<String, Object>> items = new ArrayList<>();
        String[] lines = text.split("\\n");

        // Different item patterns
        Pattern itemWithQtyPattern = Pattern.compile("(\\d+)\\s+x\\s+(.+?)\\s+\\$(\\d+\\.\\d{2})");
        Pattern itemPattern = Pattern.compile("(.+?)\\s+\\$(\\d+\\.\\d{2})");

        for (String line : lines) {
            // Try to match item with quantity first
            Matcher qtyMatcher = itemWithQtyPattern.matcher(line);
            if (qtyMatcher.find()) {
                int quantity = Integer.parseInt(qtyMatcher.group(1));
                String itemName = qtyMatcher.group(2).trim();
                double price = Double.parseDouble(qtyMatcher.group(3));

                // Skip totals, etc.
                if (shouldSkipItem(itemName))
                    continue;

                Map<String, Object> item = new HashMap<>();
                item.put("name", itemName);
                item.put("price", price);
                item.put("quantity", quantity);
                items.add(item);
                continue;
            }

            // Try regular item pattern
            Matcher matcher = itemPattern.matcher(line);
            if (matcher.find()) {
                String itemName = matcher.group(1).trim();
                // Skip totals, etc.
                if (shouldSkipItem(itemName))
                    continue;

                double price = Double.parseDouble(matcher.group(2));

                Map<String, Object> item = new HashMap<>();
                item.put("name", itemName);
                item.put("price", price);
                item.put("quantity", 1);
                items.add(item);
            }
        }

        return items;
    }

    private boolean shouldSkipItem(String itemName) {
        String lowerName = itemName.toLowerCase();
        return lowerName.contains("total") ||
                lowerName.contains("subtotal") ||
                lowerName.contains("tax") ||
                lowerName.contains("discount") ||
                lowerName.contains("change") ||
                itemName.length() < 2;
    }
}