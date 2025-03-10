package sg.nus.iss.final_project.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.Receipt;
import sg.nus.iss.final_project.repo.ReceiptRepository;
import sg.nus.iss.final_project.service.BudgetService;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "http://localhost:4200") // Enable CORS for frontend
public class ReceiptController {
    private final ReceiptRepository receiptRepository;

    @Autowired
    private BudgetService budgetService;

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
            double totalAmount = 0.0;
            if (totalAmountObj instanceof Number) {
                totalAmount = ((Number) totalAmountObj).doubleValue();
                receipt.setTotalExpense(totalAmount);
            } else if (totalAmountObj instanceof String) {
                try {
                    totalAmount = Double.parseDouble((String) totalAmountObj);
                    receipt.setTotalExpense(totalAmount);
                } catch (NumberFormatException e) {
                    receipt.setTotalExpense(0.0);
                }
            }

            // Parse and set date
            LocalDateTime purchaseDate = LocalDateTime.now();
            Object dateObj = receiptData.get("dateOfPurchase");
            if (dateObj != null) {
                String dateStr = dateObj.toString();
                LocalDateTime parsedDate = parseDate(dateStr);
                if (parsedDate != null) {
                    purchaseDate = parsedDate;
                }
            }
            receipt.setDateOfPurchase(purchaseDate);

            // Set category if provided - handle any type
            String category = "Others";
            Object categoryObj = receiptData.get("category");
            if (categoryObj != null) {
                category = categoryObj.toString();
                receipt.setCategory(category);
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

            // Update budget with this expense
            if (receipt.getUserId() != null && totalAmount > 0) {
                // Format month-year as YYYY-MM from the purchase date
                String monthYear = purchaseDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));

                // Add the expense to the user's budget
                budgetService.addExpenseToBudget(receipt.getUserId(), monthYear, category, totalAmount);
            }

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

    @DeleteMapping("/{receiptId}")
    public ResponseEntity<?> deleteReceipt(@PathVariable String receiptId) {
        try {
            // Find receipt before deleting it
            Optional<Receipt> receiptOpt = receiptRepository.findById(receiptId);

            if (receiptOpt.isPresent()) {
                Receipt receipt = receiptOpt.get();

                // Delete the receipt
                receiptRepository.deleteById(receiptId);

                // Update budget by removing the expense
                if (receipt.getUserId() != null && receipt.getTotalExpense() > 0) {
                    // Format month-year as YYYY-MM from the purchase date
                    String monthYear = receipt.getDateOfPurchase().format(DateTimeFormatter.ofPattern("yyyy-MM"));

                    // Remove the expense from the user's budget
                    budgetService.removeExpenseFromBudget(
                            receipt.getUserId(),
                            monthYear,
                            receipt.getCategory(),
                            receipt.getTotalExpense());
                }

                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting receipt: " + e.getMessage());
        }
    }

    // Helper method to parse different date formats
    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            System.out.println("Empty date string, using current date");
            return LocalDateTime.now();
        }

        System.out.println("Attempting to parse date: " + dateStr);

        // Try the most common format for your receipts first (dd/MM/yyyy)
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            LocalDate date = LocalDate.parse(dateStr, formatter);
            System.out.println("Successfully parsed date with dd/MM/yyyy format: " + date);
            return LocalDateTime.of(date, LocalTime.MIDNIGHT);
        } catch (DateTimeParseException e) {
            System.out.println("Failed to parse as dd/MM/yyyy format");
        }

        // Try MM/dd/yyyy format (US style)
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy");
            LocalDate date = LocalDate.parse(dateStr, formatter);
            System.out.println("Successfully parsed date with MM/dd/yyyy format: " + date);
            return LocalDateTime.of(date, LocalTime.MIDNIGHT);
        } catch (DateTimeParseException e) {
            System.out.println("Failed to parse as MM/dd/yyyy format");
        }

        // Try other formats if needed
        String[] otherFormats = {
                "yyyy-MM-dd",
                "dd-MM-yyyy",
                "MM-dd-yyyy",
                "yyyy/MM/dd",
                "dd.MM.yyyy"
        };

        for (String format : otherFormats) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                LocalDate date = LocalDate.parse(dateStr, formatter);
                System.out.println("Successfully parsed date with " + format + " format: " + date);
                return LocalDateTime.of(date, LocalTime.MIDNIGHT);
            } catch (DateTimeParseException e) {
                System.out.println("Failed to parse as " + format + " format");
            }
        }

        // If all parsing attempts fail, log and return current date
        System.out.println("All parsing attempts failed for: " + dateStr + ", using current date");
        return LocalDateTime.now();
    }
}