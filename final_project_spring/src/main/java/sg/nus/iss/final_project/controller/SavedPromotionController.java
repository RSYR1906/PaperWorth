package sg.nus.iss.final_project.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @Autowired
    private SavedPromotionService savedPromotionService;

    /**
     * Get all saved promotions for a user
     */
    @GetMapping("/{userId}")
    public ResponseEntity<List<Promotion>> getSavedPromotions(@PathVariable String userId) {
        try {
            List<Promotion> savedPromotions = savedPromotionService.getSavedPromotionsWithDetails(userId);
            return ResponseEntity.ok(savedPromotions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Get all saved promotions for a user in a specific category
     */
    @GetMapping("/{userId}/category/{category}")
    public ResponseEntity<List<Promotion>> getSavedPromotionsByCategory(
            @PathVariable String userId,
            @PathVariable String category) {
        try {
            List<Promotion> savedPromotions = savedPromotionService.getSavedPromotionsByCategory(userId, category);
            return ResponseEntity.ok(savedPromotions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Check if a promotion is saved by a user
     */
    @GetMapping("/{userId}/{promotionId}")
    public ResponseEntity<Map<String, Boolean>> isPromotionSaved(
            @PathVariable String userId,
            @PathVariable String promotionId) {
        try {
            boolean isSaved = savedPromotionService.isPromotionSaved(userId, promotionId);
            Map<String, Boolean> response = new HashMap<>();
            response.put("saved", isSaved);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Save a promotion for a user
     */
    @PostMapping("/{userId}/{promotionId}")
    public ResponseEntity<?> savePromotion(
            @PathVariable String userId,
            @PathVariable String promotionId) {
        try {
            SavedPromotion savedPromotion = savedPromotionService.savePromotion(userId, promotionId);
            return ResponseEntity.ok(savedPromotion);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to save promotion");
        }
    }

    /**
     * Remove a saved promotion
     */
    @DeleteMapping("/{userId}/{promotionId}")
    public ResponseEntity<Map<String, String>> removePromotion(
            @PathVariable String userId,
            @PathVariable String promotionId) {
        try {
            savedPromotionService.removePromotion(userId, promotionId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Promotion removed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Failed to remove promotion");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get the count of users who saved a promotion
     */
    @GetMapping("/count/{promotionId}")
    public ResponseEntity<Map<String, Long>> getSaveCount(@PathVariable String promotionId) {
        try {
            long count = savedPromotionService.getSaveCount(promotionId);
            Map<String, Long> response = new HashMap<>();
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}