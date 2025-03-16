package sg.nus.iss.final_project.Util;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.model.SavedPromotion;
import sg.nus.iss.final_project.model.SavedPromotionDTO;

/**
 * Utility class to convert between entity and DTO
 */
public class SavedPromotionConverter {
    /**
     * Convert a Promotion and SavedPromotion to SavedPromotionDTO
     */
    public static SavedPromotionDTO toDTO(Promotion promotion, SavedPromotion savedPromotion) {
        SavedPromotionDTO dto = new SavedPromotionDTO();

        // Set promotion details
        dto.setId(promotion.getId());
        dto.setMerchant(promotion.getMerchant());
        dto.setDescription(promotion.getDescription());
        dto.setExpiry(promotion.getExpiry());
        dto.setImageUrl(promotion.getImageUrl());
        dto.setLocation(promotion.getLocation());
        dto.setCode(promotion.getCode());
        dto.setConditions(promotion.getConditions());
        dto.setCategory(promotion.getCategory());
        dto.setPromotionId(promotion.getPromotionId());

        // Set saved promotion details
        dto.setSavedPromotionId(savedPromotion.getId());
        dto.setSavedAt(savedPromotion.getSavedAt());

        return dto;
    }

    /**
     * Convert a list of Promotions and SavedPromotions to a list of
     * SavedPromotionDTOs
     */
    public static List<SavedPromotionDTO> toDTOList(List<Promotion> promotions, List<SavedPromotion> savedPromotions) {
        // Create a map of promotion IDs to SavedPromotion objects for efficient lookup
        Map<String, SavedPromotion> savedPromotionMap = savedPromotions.stream()
                .collect(Collectors.toMap(SavedPromotion::getPromotionId, Function.identity()));

        List<SavedPromotionDTO> dtoList = new ArrayList<>();

        // For each promotion, find the matching saved promotion and convert to DTO
        for (Promotion promotion : promotions) {
            SavedPromotion savedPromotion = savedPromotionMap.get(promotion.getId());
            if (savedPromotion != null) {
                dtoList.add(toDTO(promotion, savedPromotion));
            }
        }

        return dtoList;
    }

    /**
     * Find a matching promotion for a saved promotion
     */
    public static Optional<Promotion> findMatchingPromotion(SavedPromotion savedPromotion, List<Promotion> promotions) {
        return promotions.stream()
                .filter(p -> p.getId().equals(savedPromotion.getPromotionId()))
                .findFirst();
    }

    /**
     * Convert saved promotions to DTOs, with promotions looked up from a list
     */
    public static List<SavedPromotionDTO> fromSavedPromotions(List<SavedPromotion> savedPromotions,
            List<Promotion> promotions) {
        List<SavedPromotionDTO> dtoList = new ArrayList<>();

        // Create a map of promotion IDs to Promotion objects for efficient lookup
        Map<String, Promotion> promotionMap = promotions.stream()
                .collect(Collectors.toMap(Promotion::getId, Function.identity()));

        // For each saved promotion, find the matching promotion and convert to DTO
        for (SavedPromotion savedPromotion : savedPromotions) {
            Promotion promotion = promotionMap.get(savedPromotion.getPromotionId());
            if (promotion != null) {
                dtoList.add(toDTO(promotion, savedPromotion));
            }
        }

        return dtoList;
    }
}