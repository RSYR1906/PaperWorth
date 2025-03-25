package sg.nus.iss.final_project.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.model.SavedPromotion;
import sg.nus.iss.final_project.repo.PromotionRepository;
import sg.nus.iss.final_project.repo.SavedPromotionRepository;

@Service
public class SavedPromotionService {

    @Autowired
    private SavedPromotionRepository savedPromotionRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    /**
     * Save a promotion for a user
     */
    public SavedPromotion savePromotion(String userId, String promotionId) {
        // Check if the promotion exists
        Promotion promotion = promotionRepository.findById(promotionId);
        if (promotion == null) {
            throw new IllegalArgumentException("Promotion not found with ID: " + promotionId);
        }

        // Check if already saved
        Optional<SavedPromotion> existingSavedPromotion = savedPromotionRepository.findByUserIdAndPromotionId(userId,
                promotionId);
        if (existingSavedPromotion.isPresent()) {
            return existingSavedPromotion.get(); // Already saved
        }

        // Create new saved promotion
        SavedPromotion savedPromotion = new SavedPromotion(userId, promotionId);
        return savedPromotionRepository.save(savedPromotion);
    }

    /**
     * Remove a saved promotion
     */
    @Transactional
    public void removePromotion(String userId, String promotionId) {
        savedPromotionRepository.deleteByUserIdAndPromotionId(userId, promotionId);
    }

    /**
     * Get all saved promotions for a user with promotion details
     */
    public List<Promotion> getSavedPromotionsWithDetails(String userId) {
        List<SavedPromotion> savedPromotions = savedPromotionRepository.findByUserIdOrderBySavedAtDesc(userId);

        if (savedPromotions.isEmpty()) {
            return new ArrayList<>();
        }

        // Get all promotion IDs
        List<String> promotionIds = savedPromotions.stream()
                .map(SavedPromotion::getPromotionId)
                .collect(Collectors.toList());

        // Fetch all promotions
        List<Promotion> promotions = savedPromotionRepository.findByBatchId(promotionIds);
        // Add saved datetime to each promotion
        return promotions.stream().map(promotion -> {
            // Find the matching saved promotion to get savedAt timestamp
            Optional<SavedPromotion> savedPromotion = savedPromotions.stream()
                    .filter(sp -> sp.getPromotionId().equals(promotion.getId()))
                    .findFirst();

            // Set savedAt as a field in the promotion object
            if (savedPromotion.isPresent()) {
                promotion.setSavedAt(savedPromotion.get().getSavedAt());
            }

            return promotion;
        }).collect(Collectors.toList());
    }

    /**
     * Check if a promotion is saved by a user
     */
    public boolean isPromotionSaved(String userId, String promotionId) {
        return savedPromotionRepository.existsByUserIdAndPromotionId(userId, promotionId);
    }

    /**
     * Get the count of users who saved a promotion
     */
    public long getSaveCount(String promotionId) {
        return savedPromotionRepository.countByPromotionId(promotionId);
    }

    /**
     * Get all saved promotions for a user with specific category
     */
    public List<Promotion> getSavedPromotionsByCategory(String userId, String category) {
        // First get all promotions in the category
        List<Promotion> categoryPromotions = promotionRepository.findByCategory(category);

        if (categoryPromotions.isEmpty()) {
            return new ArrayList<>();
        }

        // Extract their IDs
        List<String> categoryPromotionIds = categoryPromotions.stream()
                .map(Promotion::getId)
                .collect(Collectors.toList());

        // Find which ones the user has saved
        List<SavedPromotion> savedPromotions = savedPromotionRepository.findByUserIdAndPromotionIdIn(userId,
                categoryPromotionIds);

        if (savedPromotions.isEmpty()) {
            return new ArrayList<>();
        }

        // Extract the promotion IDs that are saved
        List<String> savedPromotionIds = savedPromotions.stream()
                .map(SavedPromotion::getPromotionId)
                .collect(Collectors.toList());

        // Filter the category promotions to only include those that are saved
        List<Promotion> result = categoryPromotions.stream()
                .filter(p -> savedPromotionIds.contains(p.getId()))
                .collect(Collectors.toList());

        // Add saved datetime to each promotion
        for (Promotion promotion : result) {
            Optional<SavedPromotion> savedPromotion = savedPromotions.stream()
                    .filter(sp -> sp.getPromotionId().equals(promotion.getId()))
                    .findFirst();

            if (savedPromotion.isPresent()) {
                promotion.setSavedAt(savedPromotion.get().getSavedAt());
            }
        }

        return result;
    }
}