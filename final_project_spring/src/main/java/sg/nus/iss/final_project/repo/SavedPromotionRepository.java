package sg.nus.iss.final_project.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import sg.nus.iss.final_project.model.SavedPromotion;

public interface SavedPromotionRepository extends MongoRepository<SavedPromotion, String> {

    // Find all saved promotions for a specific user
    List<SavedPromotion> findByUserId(String userId);

    // Find a specific saved promotion by user ID and promotion ID
    Optional<SavedPromotion> findByUserIdAndPromotionId(String userId, String promotionId);

    // Delete a saved promotion by user ID and promotion ID
    void deleteByUserIdAndPromotionId(String userId, String promotionId);

    // Check if a promotion is saved by a specific user
    boolean existsByUserIdAndPromotionId(String userId, String promotionId);

    // Count how many users have saved a specific promotion
    long countByPromotionId(String promotionId);

    // Find the most recently saved promotions for a user
    List<SavedPromotion> findByUserIdOrderBySavedAtDesc(String userId);

    // Find promotions saved by a user within a specific category
    // This requires a custom query to join with promotions collection
    @Query("{ 'userId': ?0, 'promotionId': { $in: ?1 } }")
    List<SavedPromotion> findByUserIdAndPromotionIdIn(String userId, List<String> promotionIds);
}