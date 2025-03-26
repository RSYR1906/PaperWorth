package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.Promotion;

@Repository
public class PromotionRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<Promotion> findAll() {
        return mongoTemplate.findAll(Promotion.class, "promotions");
    }

    public Promotion findById(String id) {
        return mongoTemplate.findById(id, Promotion.class, "promotions");
    }

    public Promotion save(Promotion promotion) {
        return mongoTemplate.save(promotion, "promotions");
    }

    public List<Promotion> findByMerchant(String merchant) {
        Query query = new Query(Criteria.where("merchant").is(merchant));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public List<Promotion> findByMerchantContainingIgnoreCase(String merchant) {
        Query query = new Query(Criteria.where("merchant").regex(merchant, "i"));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public List<Promotion> findByCategory(String category) {
        Query query = new Query(Criteria.where("category").is(category));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public List<Promotion> findByMerchantOrDescriptionContaining(String text) {
        Criteria merchantCriteria = Criteria.where("merchant").regex(text, "i");
        Criteria descriptionCriteria = Criteria.where("description").regex(text, "i");
        Query query = new Query(new Criteria().orOperator(merchantCriteria, descriptionCriteria));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public List<Promotion> findByExpiryGreaterThan(String date) {
        Query query = new Query(Criteria.where("expiry").gt(date));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public List<Promotion> findByCategoryOrderByExpiry(String category) {
        Query query = new Query(Criteria.where("category").is(category))
                .with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC,
                        "expiry"));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public Promotion findByPromotionId(int promotionId) {
        Query query = new Query(Criteria.where("promotionId").is(promotionId));
        return mongoTemplate.findOne(query, Promotion.class, "promotions");
    }

    public void delete(Promotion promotion) {
        mongoTemplate.remove(promotion);
    }

    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, Promotion.class, "promotions");
    }

    public List<Promotion> findAllById(Iterable<String> ids) {
        Query query = new Query(Criteria.where("id").in(ids));
        return mongoTemplate.find(query, Promotion.class, "promotions");
    }

    public boolean existsById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        return mongoTemplate.exists(query, Promotion.class, "promotions");
    }
}