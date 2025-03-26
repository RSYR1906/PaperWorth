package sg.nus.iss.final_project.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.Util.DateUtil;
import sg.nus.iss.final_project.model.PointTransaction;
import sg.nus.iss.final_project.model.Receipt;
import sg.nus.iss.final_project.repo.ReceiptRepository;
import sg.nus.iss.final_project.service.BudgetService;
import sg.nus.iss.final_project.service.RewardsService;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {
    private static final Logger logger = LoggerFactory.getLogger(ReceiptController.class);

    private final ReceiptRepository receiptRepository;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private RewardsService rewardsService;

    public ReceiptController(ReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
        logger.info("ReceiptController initialized with repository: {}", receiptRepository);
    }

    @GetMapping("/user/{userId}/recent")
    public List<Receipt> getRecentUserReceipts(@PathVariable String userId) {
        logger.info("Getting recent receipts for user: {}", userId);
        List<Receipt> receipts = receiptRepository.findRecentByUserId(userId);
        logger.info("Found {} recent receipts for user: {}", receipts.size(), userId);
        receipts.forEach(r -> logger.debug("Recent receipt: ID={}, merchant={}, amount={}, date={}",
                r.getId(), r.getMerchantName(), r.getTotalExpense(), r.getDateOfPurchase()));
        return receipts;
    }

    @GetMapping("/system/check")
    public Map<String, Object> checkSystem() {
        logger.info("System check requested");
        Map<String, Object> response = new HashMap<>();

        try {
            long receiptCount = receiptRepository.count();
            logger.info("Database connection successful. Total receipts: {}", receiptCount);

            response.put("status", "ok");
            response.put("database", "connected");
            response.put("receiptCount", receiptCount);
            response.put("timestamp", LocalDateTime.now().toString());

            List<Receipt> recentReceipts = receiptRepository.findAll().stream().limit(5).toList();
            logger.debug("Sample receipts for diagnostics: {}", recentReceipts);
            response.put("recentReceipts", recentReceipts);
        } catch (Exception e) {
            logger.error("Database connection failed", e);
            response.put("status", "error");
            response.put("database", "disconnected");
            response.put("error", e.getMessage());
            response.put("timestamp", LocalDateTime.now().toString());
        }
        return response;
    }

    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            logger.debug("Empty date string, using current date");
            return LocalDateTime.now();
        }
        logger.debug("Attempting to parse date: {}", dateStr);

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
                LocalDate date = LocalDate.parse(dateStr, formatter);
                logger.debug("Successfully parsed date using format {}: {}", format, date);
                return date.atTime(12, 0);
            } catch (DateTimeParseException e) {
                logger.trace("Failed to parse date {} with format {}", dateStr, format);
            }
        }

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
                LocalDateTime dateTime = LocalDateTime.parse(dateStr, formatter);
                logger.debug("Successfully parsed datetime using format {}: {}", format, dateTime);
                return dateTime;
            } catch (DateTimeParseException e) {
                logger.trace("Failed to parse datetime {} with format {}", dateStr, format);
            }
        }
        logger.warn("All parsing attempts failed for date string: {}, using current date", dateStr);
        return LocalDateTime.now();
    }

    @GetMapping("/user/{userId}")
    public List<Receipt> getUserReceipts(@PathVariable String userId) {
        logger.info("Getting receipts for user ID: {}", userId);

        try {
            List<Receipt> receipts = receiptRepository.findByUserId(userId);
            logger.info("Found {} receipts for user ID: {}", receipts.size(), userId);

            if (receipts.isEmpty()) {
                List<Receipt> allReceipts = receiptRepository.findAll();
                logger.info("Total receipts in database: {}", allReceipts.size());

                logger.debug("All receipts in database:");
                for (Receipt receipt : allReceipts) {
                    logger.debug("Receipt: ID={}, userID={}, merchant={}, amount={}",
                            receipt.getId(), receipt.getUserId(), receipt.getMerchantName(), receipt.getTotalExpense());
                }

                logger.info("Trying manual filtering for user ID: {}", userId);
                receipts = receiptRepository.findAll().stream()
                        .filter(r -> r.getUserId() != null &&
                                (r.getUserId().equals(userId) || r.getUserId().equals(userId.toString())))
                        .toList();

                logger.info("After manual filtering found {} receipts for user ID: {}", receipts.size(), userId);
            }
            return receipts;
        } catch (Exception e) {
            logger.error("Exception while fetching receipts for user ID: {}", userId, e);
            return new ArrayList<>();
        }
    }

    @GetMapping("/{receiptId}")
    public ResponseEntity<?> getReceiptById(@PathVariable String receiptId) {
        logger.info("Getting receipt with ID: {}", receiptId);
        Receipt receipt = receiptRepository.findById(receiptId);
        if (receipt != null) {
            logger.info("Found receipt: ID={}, userID={}, merchant={}, amount={}",
                    receipt.getId(), receipt.getUserId(), receipt.getMerchantName(), receipt.getTotalExpense());
            return ResponseEntity.ok(receipt);
        } else {
            logger.warn("Receipt not found with ID: {}", receiptId);
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addReceipt(@RequestBody Map<String, Object> receiptData) {
        logger.info("Received new receipt data: {}", receiptData);

        try {
            Receipt receipt = new Receipt();
            Object userIdObj = receiptData.get("userId");
            if (userIdObj != null) {
                receipt.setUserId(userIdObj.toString());
                logger.debug("Set user ID: {}", receipt.getUserId());
            } else {
                logger.warn("Receipt data missing userId");
            }
            Object merchantNameObj = receiptData.get("merchantName");
            if (merchantNameObj != null) {
                receipt.setMerchantName(merchantNameObj.toString());
                logger.debug("Set merchant name: {}", receipt.getMerchantName());
            } else {
                logger.warn("Receipt data missing merchantName");
            }
            double totalAmount = 0.0;
            Object totalExpenseObj = receiptData.get("totalExpense");
            if (totalExpenseObj == null) {
                logger.debug("totalExpense not found, trying totalAmount");
                totalExpenseObj = receiptData.get("totalAmount"); // Fallback to legacy field name
            }
            if (totalExpenseObj instanceof Number) {
                totalAmount = ((Number) totalExpenseObj).doubleValue();
                receipt.setTotalExpense(totalAmount);
                logger.debug("Set total expense from Number: {}", totalAmount);
            } else if (totalExpenseObj instanceof String) {
                try {
                    totalAmount = Double.parseDouble((String) totalExpenseObj);
                    receipt.setTotalExpense(totalAmount);
                    logger.debug("Set total expense from String: {}", totalAmount);
                } catch (NumberFormatException e) {
                    logger.warn("Failed to parse total expense from String: {}", totalExpenseObj, e);
                    receipt.setTotalExpense(0.0);
                }
            } else {
                logger.warn("Receipt data missing or invalid totalExpense/totalAmount: {}", totalExpenseObj);
            }

            LocalDateTime purchaseDate = LocalDateTime.now();
            Object dateObj = receiptData.get("dateOfPurchase");
            if (dateObj != null) {
                String dateStr = dateObj.toString();
                LocalDateTime parsedDate = DateUtil.parseDate(dateStr);
                if (parsedDate != null) {
                    purchaseDate = parsedDate;
                    logger.debug("Set date of purchase: {}", purchaseDate);
                } else {
                    logger.warn("Failed to parse date: {}", dateStr);
                }
            } else {
                logger.warn("Receipt data missing dateOfPurchase");
            }
            receipt.setDateOfPurchase(purchaseDate);

            String category = "Others";
            Object categoryObj = receiptData.get("category");
            if (categoryObj != null) {
                category = categoryObj.toString();
                logger.debug("Set category: {}", category);
            } else {
                logger.debug("Using default category: {}", category);
            }
            receipt.setCategory(category);

            Object imageUrlObj = receiptData.get("imageUrl");
            if (imageUrlObj != null) {
                receipt.setImageUrl(imageUrlObj.toString());
                logger.debug("Set image URL");
            }

            Object itemsObj = receiptData.get("items");
            if (itemsObj instanceof List) {
                List<?> itemsList = (List<?>) itemsObj;
                String[] itemsArray = new String[itemsList.size()];
                for (int i = 0; i < itemsList.size(); i++) {
                    Object item = itemsList.get(i);

                    if (item instanceof Map && ((Map<?, ?>) item).containsKey("name")) {
                        itemsArray[i] = ((Map<?, ?>) item).get("name").toString();
                    } else {
                        itemsArray[i] = item != null ? item.toString() : "";
                    }
                }
                receipt.setItems(itemsArray);
                logger.debug("Set {} items", itemsArray.length);
            }

            receipt.setScanDate(LocalDateTime.now());

            Receipt savedReceipt = receiptRepository.save(receipt);
            logger.info("Saved receipt: ID={}, userID={}, merchant={}, amount={}",
                    savedReceipt.getId(), savedReceipt.getUserId(), savedReceipt.getMerchantName(),
                    savedReceipt.getTotalExpense());

            if (receipt.getUserId() != null && totalAmount > 0) {
                String monthYear = purchaseDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                logger.info("Updating budget for user: {}, month: {}, category: {}, amount: {}",
                        receipt.getUserId(), monthYear, category, totalAmount);

                budgetService.addExpenseToBudget(receipt.getUserId(), monthYear, category, totalAmount);
            }

            logger.info("Awarding points for receipt ID: {}", savedReceipt.getId());
            PointTransaction pointsAwarded = rewardsService.awardPointsForReceipt(savedReceipt.getId());
            int points = pointsAwarded != null ? pointsAwarded.getPoints() : 0;
            logger.info("Awarded {} points for receipt ID: {}", points, savedReceipt.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("receipt", savedReceipt);
            response.put("pointsAwarded", points);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error saving receipt", e);
            return ResponseEntity.badRequest().body("Error saving receipt: " + e.getMessage());
        }
    }

    @DeleteMapping("/{receiptId}")
    public ResponseEntity<?> deleteReceipt(@PathVariable String receiptId) {
        logger.info("Deleting receipt with ID: {}", receiptId);
        try {
            Receipt receipt = receiptRepository.findById(receiptId);

            if (receipt != null) {
                logger.info("Found receipt to delete: ID={}, userID={}, merchant={}, amount={}",
                        receipt.getId(), receipt.getUserId(), receipt.getMerchantName(), receipt.getTotalExpense());

                receiptRepository.deleteById(receiptId);
                logger.info("Receipt deleted successfully: {}", receiptId);

                if (receipt.getUserId() != null && receipt.getTotalExpense() > 0) {
                    String monthYear = receipt.getDateOfPurchase().format(DateTimeFormatter.ofPattern("yyyy-MM"));
                    logger.info("Updating budget to remove expense: user={}, month={}, category={}, amount={}",
                            receipt.getUserId(), monthYear, receipt.getCategory(), receipt.getTotalExpense());

                    budgetService.removeExpenseFromBudget(
                            receipt.getUserId(),
                            monthYear,
                            receipt.getCategory(),
                            receipt.getTotalExpense());
                }

                return ResponseEntity.ok().build();
            } else {
                logger.warn("Receipt not found for deletion with ID: {}", receiptId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error deleting receipt: {}", receiptId, e);
            return ResponseEntity.status(500).body("Error deleting receipt: " + e.getMessage());
        }
    }
}