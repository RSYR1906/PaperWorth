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

    public List<SavedPromotion> findAll() {
        return mongoTemplate.findAll(SavedPromotion.class, "savedPromotions");
    }

    public SavedPromotion findById(String id) {
        return mongoTemplate.findById(id, SavedPromotion.class, "savedPromotions");
    }

    public List<Promotion> findByBatchId(List<String> list) {
        Query query = new Query(Criteria.where("id").in(list));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public Optional<SavedPromotion> findByIdOptional(String id) {
        SavedPromotion savedPromotion = mongoTemplate.findById(id, SavedPromotion.class, "savedPromotions");
        return Optional.ofNullable(savedPromotion);
    }

    public SavedPromotion save(SavedPromotion savedPromotion) {
        return mongoTemplate.save(savedPromotion);
    }

    public List<SavedPromotion> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, SavedPromotion.class, "savedPromotions");
    }

    public Optional<SavedPromotion> findByUserIdAndPromotionId(String userId, String promotionId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").is(promotionId));
        SavedPromotion savedPromotion = mongoTemplate.findOne(query, SavedPromotion.class, "savedPromotions");
        return Optional.ofNullable(savedPromotion);
    }

    public void deleteByUserIdAndPromotionId(String userId, String promotionId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").is(promotionId));
        mongoTemplate.remove(query, SavedPromotion.class, "savedPromotions");
    }

    public boolean existsByUserIdAndPromotionId(String userId, String promotionId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").is(promotionId));
        return mongoTemplate.exists(query, SavedPromotion.class, "savedPromotions");
    }

    public long countByPromotionId(String promotionId) {
        Query query = new Query(Criteria.where("promotionId").is(promotionId));
        return mongoTemplate.count(query, SavedPromotion.class, "savedPromotions");
    }

    public List<SavedPromotion> findByUserIdOrderBySavedAtDesc(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId))
                .with(Sort.by(Sort.Direction.DESC, "savedAt"));
        return mongoTemplate.find(query, SavedPromotion.class, "savedPromotions");
    }

    public List<SavedPromotion> findByUserIdAndPromotionIdIn(String userId, List<String> promotionIds) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("promotionId").in(promotionIds));
        return mongoTemplate.find(query, SavedPromotion.class, "savedPromotions");
    }

    public void delete(SavedPromotion savedPromotion) {
        mongoTemplate.remove(savedPromotion, "savedPromotions");
    }

    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, SavedPromotion.class, "savedPromotions");
    }
}