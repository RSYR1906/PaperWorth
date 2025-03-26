package sg.nus.iss.final_project.controller;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.repo.PromotionRepository;
import sg.nus.iss.final_project.service.PromotionService;

@RestController
@RequestMapping("/api/promotions")
public class PromotionController {

    @Autowired
    private PromotionService promotionService;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private PromotionRepository promotionRepository;

    @GetMapping("")
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        List<Promotion> promotions = promotionService.getAllPromotions();
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/category/{categoryName}")
    public ResponseEntity<List<Promotion>> getPromotionsByCategory(@PathVariable String categoryName) {
        List<Promotion> promotions = promotionService.getPromotionsByCategory(categoryName);
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPromotionById(@PathVariable String id) {
        Promotion promotion = promotionService.getPromotionById(id);
        if (promotion != null) {
            return ResponseEntity.ok(promotion);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/merchant/{merchant}")
    public ResponseEntity<List<Promotion>> getPromotionsByMerchant(@PathVariable String merchant) {
        List<Promotion> promotions = promotionService.getPromotionsByMerchant(merchant);
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/match")
    public ResponseEntity<List<Promotion>> getMatchingPromotions(
            @RequestParam(required = false) String merchant,
            @RequestParam(required = false) String category) {

        if ((merchant == null || merchant.isEmpty()) && (category == null || category.isEmpty())) {
            return getAllPromotions();
        }

        Criteria criteria = new Criteria();

        if (category != null && !category.trim().isEmpty()) {
            criteria = Criteria.where("category").regex(category, "i");
        }

        if (merchant != null && !merchant.trim().isEmpty() && category != null && !category.trim().isEmpty()) {
            Criteria merchantCriteria = new Criteria().orOperator(
                    Criteria.where("merchant").regex(merchant, "i"),
                    Criteria.where("description").regex(merchant, "i"));
            Criteria categoryCriteria = Criteria.where("category").is(category);
            criteria = new Criteria().orOperator(merchantCriteria, categoryCriteria);
        } else if (merchant != null && !merchant.trim().isEmpty()) {
            criteria = new Criteria().orOperator(
                    Criteria.where("merchant").regex(merchant, "i"),
                    Criteria.where("description").regex(merchant, "i"));
        } else if (category != null && !category.trim().isEmpty()) {
            criteria = Criteria.where("category").is(category);
        }
        Query query = new Query(criteria);
        List<Promotion> promotions = mongoTemplate.find(query, Promotion.class, "promotions");
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<Promotion>> getPromotionsByReceiptId(@PathVariable String receiptId) {
        Query receiptQuery = new Query(Criteria.where("_id").is(receiptId));
        @SuppressWarnings("unchecked")
        Map<String, Object> receipt = mongoTemplate.findOne(receiptQuery, Map.class, "receipts");

        if (receipt != null) {
            String merchant = (String) receipt.get("merchant");
            if (merchant == null) {
                merchant = (String) receipt.get("merchantName");
            }

            String category = (String) receipt.get("category");

            if (merchant != null || category != null) {
                return getMatchingPromotions(merchant, category);
            }
        }

        String fallbackCategory = getFallbackCategory(receiptId);
        if (!fallbackCategory.isEmpty()) {
            List<Promotion> promotions = promotionService.getPromotionsByCategory(fallbackCategory);
            return ResponseEntity.ok(promotions);
        }
        return ResponseEntity.ok(Collections.emptyList());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Promotion>> searchPromotions(@RequestParam String query) {
        List<Promotion> promotions = promotionRepository.findByMerchantOrDescriptionContaining(query);
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/active")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        String currentDate = LocalDate.now().toString();
        List<Promotion> promotions = promotionRepository.findByExpiryGreaterThan(currentDate);
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/id/{promotionId}")
    public ResponseEntity<?> getPromotionByNumericId(@PathVariable int promotionId) {
        Promotion promotion = promotionRepository.findByPromotionId(promotionId);
        if (promotion != null) {
            return ResponseEntity.ok(promotion);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<Promotion> addPromotion(@RequestBody Promotion promotion) {
        Promotion savedPromotion = promotionService.savePromotion(promotion);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPromotion);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePromotion(@PathVariable String id, @RequestBody Promotion promotion) {
        if (!promotionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        promotion.setId(id);
        Promotion updatedPromotion = promotionService.savePromotion(promotion);
        return ResponseEntity.ok(updatedPromotion);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePromotion(@PathVariable String id) {
        if (!promotionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        promotionService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }

    private String getFallbackCategory(String receiptId) {
        Map<String, String> categoryMap = Map.of(
                "1", "Groceries",
                "2", "Cafes",
                "3", "Fast Food");
        return categoryMap.getOrDefault(receiptId, "");
    }
}