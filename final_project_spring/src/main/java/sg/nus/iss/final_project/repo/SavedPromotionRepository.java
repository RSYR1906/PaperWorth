package sg.nus.iss.final_project.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.Promotion;
import sg.nus.iss.final_project.model.SavedPromotion;

@Repository
public class SavedPromotionRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    // Find all saved promotions
    public List<SavedPromotion> findAll() {
        return mongoTemplate.findAll(SavedPromotion.class, "savedPromotions");
    }

    // Find saved promotion by ID
    public SavedPromotion findById(String id) {
        return mongoTemplate.findById(id, SavedPromotion.class, "savedPromotions");
    }

    public List<Promotion> findByBatchId(List<String> list) {
        Query query = new Query(Criteria.where("id").in(list));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    // Find by ID with Optional wrapper
    public Optional<SavedPromotion> findByIdOptional(String id) {
        SavedPromotion savedPromotion = mongoTemplate.findById(id, SavedPromotion.class, "savedPromotions");
        return Optional.ofNullable(savedPromotion);
    }

    // Save saved promotion
    public SavedPromotion save(SavedPromotion savedPromotion) {
        return mongoTemplate.save(savedPromotion);
    }

    // Find all saved promotions for a specific user
    public List<SavedPromotion> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, SavedPromotion.class, "savedPromotions");
    }

    // Find a specific saved promotion by user ID and promotion ID
    public Optional<SavedPromotion> findByUserIdAndPromotionId(String userId, String promotionId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").is(promotionId));
        SavedPromotion savedPromotion = mongoTemplate.findOne(query, SavedPromotion.class, "savedPromotions");
        return Optional.ofNullable(savedPromotion);
    }

    // Delete a saved promotion by user ID and promotion ID
    public void deleteByUserIdAndPromotionId(String userId, String promotionId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").is(promotionId));
        mongoTemplate.remove(query, SavedPromotion.class, "savedPromotions");
    }

    // Check if a promotion is saved by a specific user
    public boolean existsByUserIdAndPromotionId(String userId, String promotionId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").is(promotionId));
        return mongoTemplate.exists(query, SavedPromotion.class, "savedPromotions");
    }

    // Count how many users have saved a specific promotion
    public long countByPromotionId(String promotionId) {
        Query query = new Query(Criteria.where("promotionId").is(promotionId));
        return mongoTemplate.count(query, SavedPromotion.class, "savedPromotions");
    }

    // Find the most recently saved promotions for a user
    public List<SavedPromotion> findByUserIdOrderBySavedAtDesc(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId))
                .with(Sort.by(Sort.Direction.DESC, "savedAt"));
        return mongoTemplate.find(query, SavedPromotion.class, "savedPromotions");
    }

    // Find promotions saved by a user within a specific category
    public List<SavedPromotion> findByUserIdAndPromotionIdIn(String userId, List<String> promotionIds) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").in(promotionIds));
        return mongoTemplate.find(query, SavedPromotion.class, "savedPromotions");
    }

    // Delete a saved promotion
    public void delete(SavedPromotion savedPromotion) {
        mongoTemplate.remove(savedPromotion, "savedPromotions");
    }

    // Delete a saved promotion by ID
    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, SavedPromotion.class, "savedPromotions");
    }
}