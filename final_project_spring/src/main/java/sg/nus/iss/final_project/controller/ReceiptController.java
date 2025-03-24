package sg.nus.iss.final_project.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.PointTransaction;
import sg.nus.iss.final_project.model.Receipt;
import sg.nus.iss.final_project.repo.ReceiptRepository;
import sg.nus.iss.final_project.service.BudgetService;
import sg.nus.iss.final_project.service.RewardsService;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {
    private final ReceiptRepository receiptRepository;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private RewardsService rewardsService;

    public ReceiptController(ReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    // Get recent receipts for a user
    @GetMapping("/user/{userId}/recent")
    public List<Receipt> getRecentUserReceipts(@PathVariable String userId) {
        System.out.println("Getting recent receipts for user: " + userId);
        return receiptRepository.findRecentByUserId(userId);
    }

    // Endpoint to check MongoDB connection
    @GetMapping("/system/check")
    public Map<String, Object> checkSystem() {
        Map<String, Object> response = new HashMap<>();

        try {
            // Check MongoDB connection by counting all receipts
            long receiptCount = receiptRepository.count();
            response.put("status", "ok");
            response.put("database", "connected");
            response.put("receiptCount", receiptCount);
            response.put("timestamp", LocalDateTime.now().toString());

            // Add sample receipt data for diagnostics
            List<Receipt> recentReceipts = receiptRepository.findAll().stream().limit(5).toList();
            response.put("recentReceipts", recentReceipts);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("database", "disconnected");
            response.put("error", e.getMessage());
            response.put("timestamp", LocalDateTime.now().toString());
        }

        return response;
    }

    // Helper method to parse different date formats
    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            System.out.println("Empty date string, using current date");
            return LocalDateTime.now();
        }

        System.out.println("Attempting to parse date: " + dateStr);

        // Try to parse date-only formats first, then convert to LocalDateTime
        String[] dateFormats = {
                "dd/MM/yyyy",
                "MM/dd/yyyy",
                "yyyy-MM-dd",
                "dd-MM-yyyy",
                "MM-dd-yyyy",
                "yyyy/MM/dd",
                "dd.MM.yyyy"
        };

        for (String format : dateFormats) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                // Parse as LocalDate first, then convert to LocalDateTime
                LocalDate date = LocalDate.parse(dateStr, formatter);
                // Convert to LocalDateTime with time set to noon (12:00)
                return date.atTime(12, 0);
            } catch (DateTimeParseException e) {
                // Continue trying other formats
            }
        }

        // Try with time formats
        String[] dateTimeFormats = {
                "dd/MM/yyyy HH:mm:ss",
                "MM/dd/yyyy HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        };

        for (String format : dateTimeFormats) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                return LocalDateTime.parse(dateStr, formatter);
            } catch (DateTimeParseException e) {
                // Continue trying other formats
            }
        }

        // If all parsing attempts fail, log and return current date
        System.out.println("All parsing attempts failed for: " + dateStr + ", using current date");
        return LocalDateTime.now();
    }

    @GetMapping("/user/{userId}")
    public List<Receipt> getUserReceipts(@PathVariable String userId) {
        System.out.println("Getting receipts for user: " + userId);

        try {
            // Try to find receipts using the standard repository method
            List<Receipt> receipts = receiptRepository.findByUserId(userId);
            System.out.println("Found " + receipts.size() + " receipts for user ID: " + userId);

            if (receipts.isEmpty()) {
                // Log all receipts in the database for debugging
                List<Receipt> allReceipts = receiptRepository.findAll();
                System.out.println("Total receipts in database: " + allReceipts.size());

                for (Receipt receipt : allReceipts) {
                    System.out.println("Found receipt: ID=" + receipt.getId() +
                            ", userID=" + receipt.getUserId() +
                            ", merchant=" + receipt.getMerchantName() +
                            ", amount=" + receipt.getTotalExpense());
                }

                // Try a manual approach to see if there might be format issues with IDs
                receipts = receiptRepository.findAll().stream()
                        .filter(r -> r.getUserId() != null &&
                                (r.getUserId().equals(userId) ||
                                        r.getUserId().equals(userId.toString())))
                        .toList();

                System.out.println("After manual filtering found " + receipts.size() + " receipts");
            }

            return receipts;
        } catch (Exception e) {
            System.err.println("Exception while fetching receipts: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    @GetMapping("/{receiptId}")
    public ResponseEntity<?> getReceiptById(@PathVariable String receiptId) {
        System.out.println("Getting receipt with ID: " + receiptId);
        Receipt receipt = receiptRepository.findById(receiptId);
        if (receipt != null) {
            System.out.println("Found receipt: " + receipt);
            return ResponseEntity.ok(receipt);
        } else {
            System.out.println("Receipt not found with ID: " + receiptId);
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addReceipt(@RequestBody Map<String, Object> receiptData) {
        try {
            System.out.println("Received receipt data: " + receiptData);

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

            // Handle numeric total amount - check for different property names
            double totalAmount = 0.0;
            Object totalAmountObj = receiptData.get("totalAmount");
            if (totalAmountObj == null) {
                totalAmountObj = receiptData.get("totalExpense");
            }

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
            System.out.println("Saved receipt: " + savedReceipt);

            // Update budget with this expense
            if (receipt.getUserId() != null && totalAmount > 0) {
                // Format month-year as YYYY-MM from the purchase date
                String monthYear = purchaseDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));

                // Add the expense to the user's budget
                budgetService.addExpenseToBudget(receipt.getUserId(), monthYear, category, totalAmount);
            }

            // Award points for scanning the receipt
            PointTransaction pointsAwarded = rewardsService.awardPointsForReceipt(savedReceipt.getId());

            // Create response that includes both the receipt and points awarded
            Map<String, Object> response = new HashMap<>();
            response.put("receipt", savedReceipt);
            response.put("pointsAwarded", pointsAwarded != null ? pointsAwarded.getPoints() : 0);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace(); // Log the exception details
            return ResponseEntity.badRequest().body("Error saving receipt: " + e.getMessage());
        }
    }

    @DeleteMapping("/{receiptId}")
    public ResponseEntity<?> deleteReceipt(@PathVariable String receiptId) {
        try {
            System.out.println("Deleting receipt with ID: " + receiptId);
            // Find receipt before deleting it
            Receipt receipt = receiptRepository.findById(receiptId);

            if (receipt != null) {
                // Delete the receipt
                receiptRepository.deleteById(receiptId);
                System.out.println("Receipt deleted successfully");

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
                System.out.println("Receipt not found for deletion with ID: " + receiptId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("Error deleting receipt: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error deleting receipt: " + e.getMessage());
        }
    }
}