package sg.nus.iss.final_project.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.model.SavedPromotion;
import sg.nus.iss.final_project.service.SavedPromotionService;

@RestController
@RequestMapping("/api/promotions/saved")
public class SavedPromotionController {
    private static final Logger logger = LoggerFactory.getLogger(SavedPromotionController.class);

    @Autowired
    private SavedPromotionService savedPromotionService;

    @GetMapping("/{userId}")
    public ResponseEntity<List<Promotion>> getSavedPromotions(@PathVariable String userId) {
        logger.info("GET request received: Getting saved promotions for user ID: {}", userId);
        try {
            List<Promotion> savedPromotions = savedPromotionService.getSavedPromotionsWithDetails(userId);
            logger.info("Found {} saved promotions for user ID: {}", savedPromotions.size(), userId);

            if (savedPromotions.isEmpty()) {
                logger.info("No saved promotions found for user ID: {}", userId);
            } else {
                logger.debug("Saved promotions details for user ID {}: {}", userId, savedPromotions);
                savedPromotions
                        .forEach(promo -> logger.info("Promotion ID: {}, Merchant: {}, Category: {}, SavedAt: {}",
                                promo.getId(), promo.getMerchant(), promo.getCategory(), promo.getSavedAt()));
            }

            return ResponseEntity.ok(savedPromotions);
        } catch (Exception e) {
            logger.error("Error getting saved promotions for user ID: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/{userId}/category/{category}")
    public ResponseEntity<List<Promotion>> getSavedPromotionsByCategory(
            @PathVariable String userId,
            @PathVariable String category) {
        logger.info("GET request received: Getting saved promotions for user ID: {} in category: {}", userId, category);
        try {
            List<Promotion> savedPromotions = savedPromotionService.getSavedPromotionsByCategory(userId, category);
            logger.info("Found {} saved promotions for user ID: {} in category: {}",
                    savedPromotions.size(), userId, category);
            return ResponseEntity.ok(savedPromotions);
        } catch (Exception e) {
            logger.error("Error getting saved promotions by category for user: {} and category: {}",
                    userId, category, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/{userId}/{promotionId}")
    public ResponseEntity<Map<String, Boolean>> isPromotionSaved(
            @PathVariable String userId,
            @PathVariable String promotionId) {
        logger.info("GET request received: Checking if promotion ID: {} is saved by user ID: {}", promotionId, userId);
        try {
            boolean isSaved = savedPromotionService.isPromotionSaved(userId, promotionId);
            Map<String, Boolean> response = new HashMap<>();
            response.put("saved", isSaved);
            logger.info("Promotion ID: {} is{} saved by user ID: {}",
                    promotionId, isSaved ? "" : " not", userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error checking if promotion is saved for user: {} and promotion: {}",
                    userId, promotionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/{userId}/{promotionId}")
    public ResponseEntity<?> savePromotion(
            @PathVariable String userId,
            @PathVariable String promotionId) {
        logger.info("POST request received: Saving promotion ID: {} for user ID: {}", promotionId, userId);
        try {
            boolean alreadySaved = savedPromotionService.isPromotionSaved(userId, promotionId);
            if (alreadySaved) {
                logger.info("Promotion ID: {} is already saved by user ID: {}", promotionId, userId);
                Map<String, String> response = new HashMap<>();
                response.put("message", "Promotion is already saved");
                return ResponseEntity.ok(response);
            }

            SavedPromotion savedPromotion = savedPromotionService.savePromotion(userId, promotionId);
            logger.info("Successfully saved promotion ID: {} for user ID: {}, saved at: {}",
                    promotionId, userId, savedPromotion.getSavedAt());
            return ResponseEntity.ok(savedPromotion);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request when saving promotion: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error saving promotion ID: {} for user ID: {}", promotionId, userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to save promotion");
        }
    }

    @DeleteMapping("/{userId}/{promotionId}")
    public ResponseEntity<Map<String, String>> removePromotion(
            @PathVariable String userId,
            @PathVariable String promotionId) {
        logger.info("DELETE request received: Removing promotion ID: {} for user ID: {}", promotionId, userId);
        try {
            boolean isSaved = savedPromotionService.isPromotionSaved(userId, promotionId);
            if (!isSaved) {
                logger.info("Promotion ID: {} is not saved by user ID: {}, nothing to remove", promotionId, userId);
                Map<String, String> response = new HashMap<>();
                response.put("message", "Promotion was not saved, nothing to remove");
                return ResponseEntity.ok(response);
            }
            savedPromotionService.removePromotion(userId, promotionId);
            logger.info("Successfully removed promotion ID: {} for user ID: {}", promotionId, userId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Promotion removed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error removing promotion ID: {} for user ID: {}", promotionId, userId, e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Failed to remove promotion");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/count/{promotionId}")
    public ResponseEntity<Map<String, Long>> getSaveCount(@PathVariable String promotionId) {
        logger.info("GET request received: Getting save count for promotion ID: {}", promotionId);
        try {
            long count = savedPromotionService.getSaveCount(promotionId);
            logger.info("Promotion ID: {} has been saved by {} users", promotionId, count);
            Map<String, Long> response = new HashMap<>();
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting save count for promotion ID: {}", promotionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}