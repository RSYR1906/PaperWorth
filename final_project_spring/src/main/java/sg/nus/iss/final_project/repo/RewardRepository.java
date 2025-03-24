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

    // Find all rewards
    public List<Reward> findAll() {
        return mongoTemplate.findAll(Reward.class);
    }

    // Find reward by ID
    public Reward findById(String id) {
        return mongoTemplate.findById(id, Reward.class);
    }

    // Find by ID with Optional wrapper
    public java.util.Optional<Reward> findByIdOptional(String id) {
        Reward reward = mongoTemplate.findById(id, Reward.class);
        return java.util.Optional.ofNullable(reward);
    }

    // Save reward
    public Reward save(Reward reward) {
        return mongoTemplate.save(reward);
    }

    // Find available rewards
    public List<Reward> findByIsAvailableTrue() {
        Query query = new Query(Criteria.where("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class);
    }

    // Find rewards by category
    public List<Reward> findByCategoryAndIsAvailableTrue(String category) {
        Query query = new Query(Criteria.where("category").is(category)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class);
    }

    // Find rewards by point cost range
    public List<Reward> findByPointsCostLessThanEqualAndIsAvailableTrue(int maxPoints) {
        Query query = new Query(Criteria.where("pointsCost").lte(maxPoints)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class);
    }

    // Find rewards by merchant (for vouchers)
    public List<Reward> findByMerchantNameAndIsAvailableTrue(String merchantName) {
        Query query = new Query(Criteria.where("merchantName").is(merchantName)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class);
    }

    // Custom query to find rewards that are almost out of stock
    public List<Reward> findLowStockRewards() {
        Query query = new Query(Criteria.where("quantity").lte(5)
                .and("isAvailable").is(true));
        return mongoTemplate.find(query, Reward.class);
    }

    // Delete a reward
    public void delete(Reward reward) {
        mongoTemplate.remove(reward);
    }

    // Delete a reward by ID
    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, Reward.class);
    }

    // Check if exists by ID
    public boolean existsById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        return mongoTemplate.exists(query, Reward.class);
    }
}
