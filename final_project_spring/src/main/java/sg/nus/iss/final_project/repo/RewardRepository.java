package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.Reward;

@Repository
public class RewardRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<Reward> findAll() {
        return mongoTemplate.findAll(Reward.class, "rewards");
    }

    public Reward findById(String id) {
        return mongoTemplate.findById(id, Reward.class, "rewards");
    }

    public java.util.Optional<Reward> findByIdOptional(String id) {
        Reward reward = mongoTemplate.findById(id, Reward.class, "rewards");
        return java.util.Optional.ofNullable(reward);
    }

    public Reward save(Reward reward) {
        return mongoTemplate.save(reward);
    }

    public List<Reward> findByIsAvailableTrue() {
        Query query = new Query(Criteria.where("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class, "rewards");
    }

    public List<Reward> findByCategoryAndIsAvailableTrue(String category) {
        Query query = new Query(Criteria.where("category").is(category)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class, "rewards");
    }

    public List<Reward> findByPointsCostLessThanEqualAndIsAvailableTrue(int maxPoints) {
        Query query = new Query(Criteria.where("pointsCost").lte(maxPoints)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class, "rewards");
    }

    public List<Reward> findByMerchantNameAndIsAvailableTrue(String merchantName) {
        Query query = new Query(Criteria.where("merchantName").is(merchantName)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class, "rewards");
    }

    public List<Reward> findLowStockRewards() {
        Query query = new Query(Criteria.where("quantity").lte(5)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class, "rewards");
    }

    public void delete(Reward reward) {
        mongoTemplate.remove(reward);
    }

    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, Reward.class, "rewards");
    }

    public boolean existsById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        return mongoTemplate.exists(query, Reward.class, "rewards");
    }
}
