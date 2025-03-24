package sg.nus.iss.final_project.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.repo.PromotionRepository;

@Service
public class PromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    @Cacheable(value = "promotions", key = "'all'")
    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }

    @Cacheable(value = "promotions", key = "'category:' + #categoryName")
    public List<Promotion> getPromotionsByCategory(String categoryName) {
        return promotionRepository.findByCategory(categoryName);
    }

    @Cacheable(value = "promotions", key = "'merchant:' + #merchant")
    public List<Promotion> getPromotionsByMerchant(String merchant) {
        return promotionRepository.findByMerchantContainingIgnoreCase(merchant);
    }

    @Cacheable(value = "promotions", key = "'id:' + #id")
    public Promotion getPromotionById(String id) {
        return promotionRepository.findById(id);
    }

    @CachePut(value = "promotions", key = "'id:' + #promotion.id")
    @CacheEvict(value = "promotions", key = "'all'")
    public Promotion savePromotion(Promotion promotion) {
        return promotionRepository.save(promotion);
    }

    @CacheEvict(value = "promotions", allEntries = true)
    public void deletePromotion(String id) {
        promotionRepository.deleteById(id);
    }
}