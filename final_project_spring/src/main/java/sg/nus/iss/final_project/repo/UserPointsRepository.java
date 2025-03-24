package sg.nus.iss.final_project.repo;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.UserPoints;

@Repository
public class UserPointsRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    // Find all user points
    public List<UserPoints> findAll() {
        return mongoTemplate.findAll(UserPoints.class);
    }

    // Find user points by ID
    public UserPoints findById(String id) {
        return mongoTemplate.findById(id, UserPoints.class);
    }

    // Find by ID with Optional wrapper
    public Optional<UserPoints> findByIdOptional(String id) {
        UserPoints userPoints = mongoTemplate.findById(id, UserPoints.class);
        return Optional.ofNullable(userPoints);
    }

    // Save user points
    public UserPoints save(UserPoints userPoints) {
        return mongoTemplate.save(userPoints);
    }

    // Find by user ID
    public Optional<UserPoints> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        UserPoints userPoints = mongoTemplate.findOne(query, UserPoints.class);
        return Optional.ofNullable(userPoints);
    }

    // Find users with high points
    public List<UserPoints> findByAvailablePointsGreaterThan(int threshold) {
        Query query = new Query(Criteria.where("availablePoints").gt(threshold));
        return mongoTemplate.find(query, UserPoints.class);
    }

    // Find users who haven't updated their points recently
    public List<UserPoints> findByLastUpdatedBefore(LocalDateTime date) {
        Query query = new Query(Criteria.where("lastUpdated").lt(date));
        return mongoTemplate.find(query, UserPoints.class);
    }

    // Delete user points
    public void delete(UserPoints userPoints) {
        mongoTemplate.remove(userPoints);
    }

    // Delete user points by ID
    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, UserPoints.class);
    }
}