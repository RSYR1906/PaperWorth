package sg.nus.iss.final_project.controller;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(origins = "http://localhost:4200") // Enable CORS for frontend
public class PromotionController {

    private final MongoTemplate mongoTemplate;

    @Autowired
    public PromotionController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Get all promotions
     */
    @GetMapping("")
    public ResponseEntity<List<Map<String, Object>>> getAllPromotions() {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> promotions = mongoTemplate.findAll(Map.class, "promotions")
                .stream()
                .map(map -> (Map<String, Object>) map)
                .collect(Collectors.toList());
        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions by category
     */
    @GetMapping("/category/{categoryName}")
    public ResponseEntity<List<Map<String, Object>>> getPromotionsByCategory(@PathVariable String categoryName) {
        Query query = new Query(Criteria.where("category").is(categoryName));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> promotions = mongoTemplate.find(query, Map.class, "promotions")
                .stream()
                .map(map -> (Map<String, Object>) map)
                .collect(Collectors.toList());
        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions based on merchant name and/or category
     */
    @GetMapping("/match")
    public ResponseEntity<List<Map<String, Object>>> getMatchingPromotions(
            @RequestParam(required = false) String merchant,
            @RequestParam(required = false) String category) {

        // If no parameters are provided, return all promotions
        if ((merchant == null || merchant.isEmpty()) && (category == null || category.isEmpty())) {
            return getAllPromotions();
        }

        // Build the query criteria
        Criteria criteria = new Criteria();

        if (merchant != null && !merchant.trim().isEmpty() && category != null && !category.trim().isEmpty()) {
            // Both merchant and category provided, use OR between them
            Criteria merchantCriteria = new Criteria().orOperator(
                    Criteria.where("merchant").regex(merchant, "i"),
                    Criteria.where("description").regex(merchant, "i"));
            Criteria categoryCriteria = Criteria.where("category").is(category);
            criteria = new Criteria().orOperator(merchantCriteria, categoryCriteria);
        } else if (merchant != null && !merchant.trim().isEmpty()) {
            // Only merchant provided
            criteria = new Criteria().orOperator(
                    Criteria.where("merchant").regex(merchant, "i"),
                    Criteria.where("description").regex(merchant, "i"));
        } else if (category != null && !category.trim().isEmpty()) {
            // Only category provided
            criteria = Criteria.where("category").is(category);
        }

        // Execute the query
        Query query = new Query(criteria);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> promotions = mongoTemplate.find(query, Map.class, "promotions")
                .stream()
                .map(map -> (Map<String, Object>) map)
                .collect(Collectors.toList());

        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions based on a receipt ID
     */
    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<Map<String, Object>>> getPromotionsByReceiptId(@PathVariable String receiptId) {
        // Try to find the receipt in MongoDB
        Query receiptQuery = new Query(Criteria.where("_id").is(receiptId));
        @SuppressWarnings("unchecked")
        Map<String, Object> receipt = mongoTemplate.findOne(receiptQuery, Map.class, "receipts");

        if (receipt != null) {
            // Extract merchant and category from the receipt
            String merchant = (String) receipt.get("merchant");
            // Also check for "merchantName" as an alternative field name
            if (merchant == null) {
                merchant = (String) receipt.get("merchantName");
            }

            String category = (String) receipt.get("category");

            // Use the match endpoint to find relevant promotions
            if (merchant != null || category != null) {
                return getMatchingPromotions(merchant, category);
            }
        }

        // Fallback logic for demo purpose when receipt not found in database
        String fallbackCategory = getFallbackCategory(receiptId);
        if (!fallbackCategory.isEmpty()) {
            Query query = new Query(Criteria.where("category").is(fallbackCategory));
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> promotions = mongoTemplate.find(query, Map.class, "promotions")
                    .stream()
                    .map(map -> (Map<String, Object>) map)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(promotions);
        }

        // If all else fails, return empty list
        return ResponseEntity.ok(Collections.emptyList());
    }

    /**
     * Helper method to provide fallback categories for demo
     */
    private String getFallbackCategory(String receiptId) {
        Map<String, String> categoryMap = Map.of(
                "1", "Groceries",
                "2", "Cafes",
                "3", "Fast Food");
        return categoryMap.getOrDefault(receiptId, "");
    }
}