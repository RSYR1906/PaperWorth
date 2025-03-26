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
    
    public static SavedPromotionDTO toDTO(Promotion promotion, SavedPromotion savedPromotion) {
        SavedPromotionDTO dto = new SavedPromotionDTO();

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
        dto.setSavedPromotionId(savedPromotion.getId());
        dto.setSavedAt(savedPromotion.getSavedAt());
        return dto;
    }


    public static List<SavedPromotionDTO> toDTOList(List<Promotion> promotions, List<SavedPromotion> savedPromotions) {
        Map<String, SavedPromotion> savedPromotionMap = savedPromotions.stream()
                .collect(Collectors.toMap(SavedPromotion::getPromotionId, Function.identity()));

        List<SavedPromotionDTO> dtoList = new ArrayList<>();

        for (Promotion promotion : promotions) {
            SavedPromotion savedPromotion = savedPromotionMap.get(promotion.getId());
            if (savedPromotion != null) {
                dtoList.add(toDTO(promotion, savedPromotion));
            }
        }

        return dtoList;
    }

    public static Optional<Promotion> findMatchingPromotion(SavedPromotion savedPromotion, List<Promotion> promotions) {
        return promotions.stream()
                .filter(p -> p.getId().equals(savedPromotion.getPromotionId()))
                .findFirst();
    }

    public static List<SavedPromotionDTO> fromSavedPromotions(List<SavedPromotion> savedPromotions,
            List<Promotion> promotions) {
        List<SavedPromotionDTO> dtoList = new ArrayList<>();

        Map<String, Promotion> promotionMap = promotions.stream()
                .collect(Collectors.toMap(Promotion::getId, Function.identity()));

        for (SavedPromotion savedPromotion : savedPromotions) {
            Promotion promotion = promotionMap.get(savedPromotion.getPromotionId());
            if (promotion != null) {
                dtoList.add(toDTO(promotion, savedPromotion));
            }
        }

        return dtoList;
    }
}