package sg.nus.iss.final_project.controller;

import java.util.Collections;
import java.util.List;
import java.util.Map;

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

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.repo.PromotionRepository;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(origins = "http://localhost:4200") // Enable CORS for frontend
public class PromotionController {

    private final MongoTemplate mongoTemplate;
    private final PromotionRepository promotionRepository;

    @Autowired
    public PromotionController(MongoTemplate mongoTemplate, PromotionRepository promotionRepository) {
        this.mongoTemplate = mongoTemplate;
        this.promotionRepository = promotionRepository;
    }

    /**
     * Get all promotions
     */
    @GetMapping("")
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        List<Promotion> promotions = promotionRepository.findAll();
        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions by category
     */
    @GetMapping("/category/{categoryName}")
    public ResponseEntity<List<Promotion>> getPromotionsByCategory(@PathVariable String categoryName) {
        List<Promotion> promotions = promotionRepository.findByCategory(categoryName);
        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions by merchant
     */
    @GetMapping("/merchant/{merchant}")
    public ResponseEntity<List<Promotion>> getPromotionsByMerchant(@PathVariable String merchant) {
        List<Promotion> promotions = promotionRepository.findByMerchantContainingIgnoreCase(merchant);
        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions based on merchant name and/or category
     */
    @GetMapping("/match")
    public ResponseEntity<List<Promotion>> getMatchingPromotions(
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
        List<Promotion> promotions = mongoTemplate.find(query, Promotion.class, "promotions");

        return ResponseEntity.ok(promotions);
    }

    /**
     * Get promotions based on a receipt ID
     */
    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<Promotion>> getPromotionsByReceiptId(@PathVariable String receiptId) {
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
            List<Promotion> promotions = promotionRepository.findByCategory(fallbackCategory);
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