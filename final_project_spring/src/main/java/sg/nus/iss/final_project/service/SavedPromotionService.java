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

    public SavedPromotion savePromotion(String userId, String promotionId) {
        Promotion promotion = promotionRepository.findById(promotionId);
        if (promotion == null) {
            throw new IllegalArgumentException("Promotion not found with ID: " + promotionId);
        }

        Optional<SavedPromotion> existingSavedPromotion = savedPromotionRepository.findByUserIdAndPromotionId(userId,
                promotionId);
        if (existingSavedPromotion.isPresent()) {
            return existingSavedPromotion.get();
        }

        SavedPromotion savedPromotion = new SavedPromotion(userId, promotionId);
        return savedPromotionRepository.save(savedPromotion);
    }

    @Transactional
    public void removePromotion(String userId, String promotionId) {
        savedPromotionRepository.deleteByUserIdAndPromotionId(userId, promotionId);
    }

    public List<Promotion> getSavedPromotionsWithDetails(String userId) {
        List<SavedPromotion> savedPromotions = savedPromotionRepository.findByUserIdOrderBySavedAtDesc(userId);

        if (savedPromotions.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> promotionIds = savedPromotions.stream()
                .map(SavedPromotion::getPromotionId)
                .collect(Collectors.toList());

        List<Promotion> promotions = savedPromotionRepository.findByBatchId(promotionIds);
            return promotions.stream().map(promotion -> {
                Optional<SavedPromotion> savedPromotion = savedPromotions.stream()
                    .filter(sp -> sp.getPromotionId().equals(promotion.getId()))
                    .findFirst();

            if (savedPromotion.isPresent()) {
                promotion.setSavedAt(savedPromotion.get().getSavedAt());
            }

            return promotion;
        }).collect(Collectors.toList());
    }

    public boolean isPromotionSaved(String userId, String promotionId) {
        return savedPromotionRepository.existsByUserIdAndPromotionId(userId, promotionId);
    }

    public long getSaveCount(String promotionId) {
        return savedPromotionRepository.countByPromotionId(promotionId);
    }

    public List<Promotion> getSavedPromotionsByCategory(String userId, String category) {
        List<Promotion> categoryPromotions = promotionRepository.findByCategory(category);

        if (categoryPromotions.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> categoryPromotionIds = categoryPromotions.stream()
                .map(Promotion::getId)
                .collect(Collectors.toList());

        List<SavedPromotion> savedPromotions = savedPromotionRepository.findByUserIdAndPromotionIdIn(userId,
                categoryPromotionIds);

        if (savedPromotions.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> savedPromotionIds = savedPromotions.stream()
                .map(SavedPromotion::getPromotionId)
                .collect(Collectors.toList());

        List<Promotion> result = categoryPromotions.stream()
                .filter(p -> savedPromotionIds.contains(p.getId()))
                .collect(Collectors.toList());

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