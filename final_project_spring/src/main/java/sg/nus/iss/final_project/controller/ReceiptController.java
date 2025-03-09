package sg.nus.iss.final_project.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.Receipt;
import sg.nus.iss.final_project.repo.ReceiptRepository;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "http://localhost:4200") // Enable CORS for frontend
public class ReceiptController {
    private final ReceiptRepository receiptRepository;

    public ReceiptController(ReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    @PostMapping
    public ResponseEntity<?> addReceipt(@RequestBody Map<String, Object> receiptData) {
        try {
            Receipt receipt = new Receipt();

            // Set user ID - handle both String and Integer types
            Object userIdObj = receiptData.get("userId");
            if (userIdObj != null) {
                receipt.setUserId(userIdObj.toString());
            }

            // Set merchant name
            Object merchantNameObj = receiptData.get("merchantName");
            if (merchantNameObj != null) {
                receipt.setMerchantName(merchantNameObj.toString());
            }

            // Handle numeric total amount
            Object totalAmountObj = receiptData.get("totalAmount");
            if (totalAmountObj instanceof Number) {
                receipt.setTotalExpense(((Number) totalAmountObj).doubleValue());
            } else if (totalAmountObj instanceof String) {
                try {
                    receipt.setTotalExpense(Double.parseDouble((String) totalAmountObj));
                } catch (NumberFormatException e) {
                    receipt.setTotalExpense(0.0);
                }
            }

            // Parse and set date
            Object dateObj = receiptData.get("date");
            if (dateObj != null) {
                String dateStr = dateObj.toString();
                LocalDateTime parsedDate = parseDate(dateStr);
                receipt.setDateOfPurchase(parsedDate != null ? parsedDate : LocalDateTime.now());
            } else {
                receipt.setDateOfPurchase(LocalDateTime.now());
            }

            // Set category if provided - handle any type
            Object categoryObj = receiptData.get("category");
            if (categoryObj != null) {
                receipt.setCategory(categoryObj.toString());
            }

            // Set image URL if provided
            Object imageUrlObj = receiptData.get("imageUrl");
            if (imageUrlObj != null) {
                receipt.setImageUrl(imageUrlObj.toString());
            }

            // Handle items if provided (could be List or array)
            Object itemsObj = receiptData.get("items");
            if (itemsObj instanceof List) {
                List<?> itemsList = (List<?>) itemsObj;
                String[] itemsArray = new String[itemsList.size()];
                for (int i = 0; i < itemsList.size(); i++) {
                    Object item = itemsList.get(i);
                    itemsArray[i] = item != null ? item.toString() : "";
                }
                receipt.setItems(itemsArray);
            }

            // Save receipt to MongoDB
            Receipt savedReceipt = receiptRepository.save(receipt);

            return ResponseEntity.ok(savedReceipt);
        } catch (Exception e) {
            e.printStackTrace(); // Log the exception details
            return ResponseEntity.badRequest().body("Error saving receipt: " + e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public List<Receipt> getUserReceipts(@PathVariable String userId) {
        return receiptRepository.findByUserId(userId);
    }

    @GetMapping("/{receiptId}")
    public ResponseEntity<?> getReceiptById(@PathVariable String receiptId) {
        return receiptRepository.findById(receiptId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Helper method to parse different date formats
    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return LocalDateTime.now();
        }

        // Try common date formats
        String[] formats = {
                "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy",
                "dd-MM-yyyy", "MM-dd-yyyy", "yyyy/MM/dd",
                "dd.MM.yyyy", "MM.dd.yyyy", "yyyy.MM.dd"
        };

        for (String format : formats) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                return LocalDateTime.of(
                        LocalDateTime.parse(dateStr, formatter).toLocalDate(),
                        LocalDateTime.now().toLocalTime());
            } catch (DateTimeParseException e) {
                // Try next format
            }
        }

        // Return current date/time if parsing fails
        return LocalDateTime.now();
    }
}