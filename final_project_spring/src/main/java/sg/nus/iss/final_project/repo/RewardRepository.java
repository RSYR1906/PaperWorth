package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import sg.nus.iss.final_project.model.Reward;

// Repository for Rewards
public interface RewardRepository extends MongoRepository<Reward, String> {
    // Find available rewards
    List<Reward> findByIsAvailableTrue();

    // Find rewards by category
    List<Reward> findByCategoryAndIsAvailableTrue(String category);

    // Find rewards by point cost range
    List<Reward> findByPointsCostLessThanEqualAndIsAvailableTrue(int maxPoints);

    // Find rewards by merchant (for vouchers)
    List<Reward> findByMerchantNameAndIsAvailableTrue(String merchantName);

    // Custom query to find rewards that are almost out of stock
    @Query("{ 'quantity': { $lte: 5 }, 'isAvailable': true }")
    List<Reward> findLowStockRewards();
}