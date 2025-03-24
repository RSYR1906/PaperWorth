package sg.nus.iss.final_project.repo;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.UserReward;

@Repository
public class UserRewardRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    // Find all user rewards
    public List<UserReward> findAll() {
        return mongoTemplate.findAll(UserReward.class);
    }

    // Find user reward by ID
    public UserReward findById(String id) {
        return mongoTemplate.findById(id, UserReward.class);
    }

    // Find by ID with Optional wrapper
    public java.util.Optional<UserReward> findByIdOptional(String id) {
        UserReward userReward = mongoTemplate.findById(id, UserReward.class);
        return java.util.Optional.ofNullable(userReward);
    }

    // Save user reward
    public UserReward save(UserReward userReward) {
        return mongoTemplate.save(userReward);
    }

    // Find by user ID
    public List<UserReward> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, UserReward.class);
    }

    // Find by status
    public List<UserReward> findByUserIdAndStatus(String userId, String status) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("status").is(status));
        return mongoTemplate.find(query, UserReward.class);
    }

    // Find redemptions by reward ID
    public List<UserReward> findByRewardId(String rewardId) {
        Query query = new Query(Criteria.where("rewardId").is(rewardId));
        return mongoTemplate.find(query, UserReward.class);
    }

    // Find recent redemptions
    public List<UserReward> findByUserIdAndRedeemedDateAfter(String userId, LocalDateTime date) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("redeemedDate").gt(date));
        return mongoTemplate.find(query, UserReward.class);
    }

    // Find expiring vouchers
    public List<UserReward> findByUserIdAndStatusAndExpiryDateBetween(
            String userId, String status, LocalDateTime start, LocalDateTime end) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("status").is(status)
                .and("expiryDate").gte(start)
                .and("expiryDate").lte(end));
        return mongoTemplate.find(query, UserReward.class);
    }

    // Delete a user reward
    public void delete(UserReward userReward) {
        mongoTemplate.remove(userReward);
    }

    // Delete a user reward by ID
    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, UserReward.class);
    }
}
