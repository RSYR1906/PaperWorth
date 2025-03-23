package sg.nus.iss.final_project.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
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
            Map<String, Object> response = Map.of(
                    "receipt", savedReceipt,
                    "pointsAwarded", pointsAwarded != null ? pointsAwarded.getPoints() : 0);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace(); // Log the exception details
            return ResponseEntity.badRequest().body("Error saving receipt: " + e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public List<Receipt> getUserReceipts(@PathVariable String userId) {
        System.out.println("Getting receipts for user: " + userId);

        try {
            // Try both methods to see what's happening
            List<Receipt> standardReceipts = receiptRepository.findByUserId(userId);
            List<Receipt> customQueryReceipts = receiptRepository.findReceiptsByUserId(userId);

            System.out.println("Standard query found " + standardReceipts.size() + " receipts");
            System.out.println("Custom query found " + customQueryReceipts.size() + " receipts");

            // Count records to verify
            long count = receiptRepository.countByUserId(userId);
            System.out.println("Count query found " + count + " receipts");

            // If we don't find any receipts, check if there are any receipts at all
            if (standardReceipts.isEmpty()) {
                long totalCount = receiptRepository.count();
                System.out.println("Total receipts in database: " + totalCount);

                if (totalCount > 0) {
                    // List all receipts to check userId
                    List<Receipt> allReceipts = receiptRepository.findAll();
                    System.out.println("All receipts in database: " + allReceipts.size());
                    for (Receipt receipt : allReceipts) {
                        System.out.println("Receipt ID: " + receipt.getId() +
                                ", User ID: " + receipt.getUserId() +
                                ", Merchant: " + receipt.getMerchantName());
                    }
                }
            }

            // If database lookup fails, return mock data for testing
            if (standardReceipts.isEmpty()) {
                System.out.println("No receipts found in database. Returning mock data for testing.");
                return getMockReceipts(userId);
            }

            return standardReceipts;
        } catch (Exception e) {
            System.err.println("Exception while fetching receipts: " + e.getMessage());
            e.printStackTrace();

            // Return mock data in case of exception for testing
            return getMockReceipts(userId);
        }
    }

    // Mock data for testing frontend when database has issues
    private List<Receipt> getMockReceipts(String userId) {
        List<Receipt> mockReceipts = new ArrayList<>();

        Receipt receipt1 = new Receipt();
        receipt1.setId("mock-receipt-1");
        receipt1.setUserId(userId);
        receipt1.setMerchantName("Mock Cold Storage");
        receipt1.setCategory("Groceries");
        receipt1.setTotalExpense(87.50);
        receipt1.setDateOfPurchase(LocalDateTime.now().minusDays(5));

        Receipt receipt2 = new Receipt();
        receipt2.setId("mock-receipt-2");
        receipt2.setUserId(userId);
        receipt2.setMerchantName("Mock Starbucks");
        receipt2.setCategory("Cafes");
        receipt2.setTotalExpense(15.80);
        receipt2.setDateOfPurchase(LocalDateTime.now().minusDays(10));

        Receipt receipt3 = new Receipt();
        receipt3.setId("mock-receipt-3");
        receipt3.setUserId(userId);
        receipt3.setMerchantName("Mock McDonald's");
        receipt3.setCategory("Fast Food");
        receipt3.setTotalExpense(22.50);
        receipt3.setDateOfPurchase(LocalDateTime.now().minusDays(2));

        mockReceipts.add(receipt1);
        mockReceipts.add(receipt2);
        mockReceipts.add(receipt3);

        return mockReceipts;
    }

    @GetMapping("/{receiptId}")
    public ResponseEntity<?> getReceiptById(@PathVariable String receiptId) {
        System.out.println("Getting receipt with ID: " + receiptId);
        return receiptRepository.findById(receiptId)
                .map(receipt -> {
                    System.out.println("Found receipt: " + receipt);
                    return ResponseEntity.ok(receipt);
                })
                .orElseGet(() -> {
                    System.out.println("Receipt not found with ID: " + receiptId);
                    return ResponseEntity.notFound().build();
                });
    }

    @DeleteMapping("/{receiptId}")
    public ResponseEntity<?> deleteReceipt(@PathVariable String receiptId) {
        try {
            System.out.println("Deleting receipt with ID: " + receiptId);
            // Find receipt before deleting it
            Optional<Receipt> receiptOpt = receiptRepository.findById(receiptId);

            if (receiptOpt.isPresent()) {
                Receipt receipt = receiptOpt.get();

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

    // Get recent receipts for a user
    @GetMapping("/user/{userId}/recent")
    public List<Receipt> getRecentUserReceipts(@PathVariable String userId) {
        System.out.println("Getting recent receipts for user: " + userId);
        try {
            List<Receipt> receipts = receiptRepository.findRecentByUserId(userId);
            System.out.println("Found " + receipts.size() + " recent receipts");

            // If no receipts found, return mock data
            if (receipts.isEmpty()) {
                return getMockReceipts(userId);
            }

            return receipts;
        } catch (Exception e) {
            System.err.println("Exception while fetching recent receipts: " + e.getMessage());
            e.printStackTrace();
            return getMockReceipts(userId);
        }
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
                System.out.println("Failed to parse as " + format + " format");
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
                System.out.println("Failed to parse as " + format + " format");
            }
        }

        // If all parsing attempts fail, log and return current date
        System.out.println("All parsing attempts failed for: " + dateStr + ", using current date");
        return LocalDateTime.now();
    }
}