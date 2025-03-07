package sg.nus.iss.final_project.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/promotions")
public class PromotionController {

    private final MongoTemplate mongoTemplate;

    @Autowired
    public PromotionController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("")
    public ResponseEntity<List<Map<String, Object>>> getAllPromotions() {
        List<Map<String, Object>> promotions = mongoTemplate.findAll(Map.class, "promotions")
                .stream()
                .map(map -> (Map<String, Object>) map)
                .collect(Collectors.toList());
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/category/{categoryName}")
    public ResponseEntity<Map<String, Object>> getPromotionsByCategory(@PathVariable String categoryName) {
        Query query = new Query(Criteria.where("category").is(categoryName));
        Map<String, Object> promotion = mongoTemplate.findOne(query, Map.class, "promotions");
        return ResponseEntity.ok(promotion);
    }

    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<Map<String, Object>>> getPromotionsByReceiptId(@PathVariable String receiptId) {
        // This would actually need logic to determine which promotions match the
        // receipt
        // For demo, just return promotions based on receipt ID
        String category = "";

        if ("1".equals(receiptId)) {
            category = "Groceries";
        } else if ("2".equals(receiptId)) {
            category = "Cafes";
        } else if ("3".equals(receiptId)) {
            category = "Fast Food";
        }

        if (!category.isEmpty()) {
            Query query = new Query(Criteria.where("category").is(category));
            List<Map<String, Object>> promotions = new ArrayList<>();
            Map<String, Object> promotion = mongoTemplate.findOne(query, Map.class, "promotions");
            if (promotion != null) {
                promotions.add(promotion);
            }
            return ResponseEntity.ok(promotions);
        }

        List<Map<String, Object>> allPromotions = mongoTemplate.findAll(Map.class, "promotions")
                .stream()
                .map(map -> (Map<String, Object>) map)
                .collect(Collectors.toList());
        return ResponseEntity.ok(allPromotions);
    }
}