package sg.nus.iss.final_project.repo;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import sg.nus.iss.final_project.model.UserReward;

public interface UserRewardRepository extends MongoRepository<UserReward, String> {
    // Find by user ID
    List<UserReward> findByUserId(String userId);

    // Find by status
    List<UserReward> findByUserIdAndStatus(String userId, String status);

    // Find redemptions by reward ID
    List<UserReward> findByRewardId(String rewardId);

    // Find recent redemptions
    List<UserReward> findByUserIdAndRedeemedDateAfter(String userId, LocalDateTime date);

    // Find expiring vouchers
    List<UserReward> findByUserIdAndStatusAndExpiryDateBetween(
            String userId, String status, LocalDateTime start, LocalDateTime end);
}
