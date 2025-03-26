package sg.nus.iss.final_project.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.repo.PromotionRepository;

@Service
public class PromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }

    public List<Promotion> getPromotionsByCategory(String categoryName) {
        return promotionRepository.findByCategory(categoryName);
    }

    public List<Promotion> getPromotionsByMerchant(String merchant) {
        return promotionRepository.findByMerchantContainingIgnoreCase(merchant);
    }

    public Promotion getPromotionById(String id) {
        return promotionRepository.findById(id);
    }

    public Promotion savePromotion(Promotion promotion) {
        return promotionRepository.save(promotion);
    }

    public void deletePromotion(String id) {
        promotionRepository.deleteById(id);
    }
}