package sg.nus.iss.final_project.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.PointTransaction;
import sg.nus.iss.final_project.model.Reward;
import sg.nus.iss.final_project.model.UserPoints;
import sg.nus.iss.final_project.model.UserReward;
import sg.nus.iss.final_project.service.RewardsService;

@RestController
@RequestMapping("/api/rewards")
@CrossOrigin(origins = "http://localhost:4200") // Enable CORS for frontend
public class RewardsController {

    @Autowired
    private RewardsService rewardsService;

    // Get all available rewards
    @GetMapping("/available")
    public ResponseEntity<List<Reward>> getAvailableRewards() {
        List<Reward> rewards = rewardsService.getAvailableRewards();
        return ResponseEntity.ok(rewards);
    }

    // Get rewards by category
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Reward>> getRewardsByCategory(@PathVariable String category) {
        List<Reward> rewards = rewardsService.getRewardsByCategory(category);
        return ResponseEntity.ok(rewards);
    }

    // Get rewards that a user can afford
    @GetMapping("/affordable/{userId}")
    public ResponseEntity<List<Reward>> getAffordableRewards(@PathVariable String userId) {
        List<Reward> rewards = rewardsService.getAffordableRewards(userId);
        return ResponseEntity.ok(rewards);
    }

    // Get a specific reward
    @GetMapping("/{rewardId}")
    public ResponseEntity<?> getRewardById(@PathVariable String rewardId) {
        Optional<Reward> reward = rewardsService.getRewardById(rewardId);
        return reward.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Get user points
    @GetMapping("/points/{userId}")
    public ResponseEntity<UserPoints> getUserPoints(@PathVariable String userId) {
        UserPoints userPoints = rewardsService.getUserPoints(userId);
        return ResponseEntity.ok(userPoints);
    }

    // Get user's redemption history
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<UserReward>> getRedemptionHistory(@PathVariable String userId) {
        List<UserReward> history = rewardsService.getUserRedemptionHistory(userId);
        return ResponseEntity.ok(history);
    }

    // Get user's point transactions
    @GetMapping("/transactions/{userId}")
    public ResponseEntity<List<PointTransaction>> getPointTransactions(
            @PathVariable String userId,
            @RequestParam(required = false) Integer days) {

        List<PointTransaction> transactions;
        if (days != null && days > 0) {
            transactions = rewardsService.getUserRecentTransactions(userId, days);
        } else {
            transactions = rewardsService.getUserPointTransactions(userId);
        }

        return ResponseEntity.ok(transactions);
    }

    // Award points for scanning a receipt
    @PostMapping("/award-points/{receiptId}")
    public ResponseEntity<?> awardPointsForReceipt(@PathVariable String receiptId) {
        try {
            PointTransaction transaction = rewardsService.awardPointsForReceipt(receiptId);
            if (transaction != null) {
                return ResponseEntity.ok(transaction);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error awarding points: " + e.getMessage());
        }
    }

    // Redeem a reward
    @PostMapping("/redeem/{userId}/{rewardId}")
    public ResponseEntity<?> redeemReward(
            @PathVariable String userId,
            @PathVariable String rewardId) {
        try {
            UserReward userReward = rewardsService.redeemReward(userId, rewardId);
            return ResponseEntity.ok(userReward);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // Add a new reward (admin function)
    @PostMapping("/admin/add")
    public ResponseEntity<Reward> addReward(@RequestBody Reward reward) {
        Reward newReward = rewardsService.addReward(reward);
        return ResponseEntity.status(HttpStatus.CREATED).body(newReward);
    }

    // Update a reward (admin function)
    @PutMapping("/admin/{rewardId}")
    public ResponseEntity<?> updateReward(
            @PathVariable String rewardId,
            @RequestBody Reward updatedReward) {
        try {
            Reward reward = rewardsService.updateReward(rewardId, updatedReward);
            return ResponseEntity.ok(reward);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Error updating reward: " + e.getMessage());
        }
    }

    // Update redemption status (admin function)
    @PutMapping("/admin/redemption/{redemptionId}")
    public ResponseEntity<?> updateRedemptionStatus(
            @PathVariable String redemptionId,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String status = statusUpdate.get("status");
            if (status == null) {
                return ResponseEntity.badRequest().body("Status is required");
            }

            UserReward userReward = rewardsService.updateRedemptionStatus(redemptionId, status);
            return ResponseEntity.ok(userReward);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Error updating redemption status: " + e.getMessage());
        }
    }

    // Add delivery info to a redemption (admin function)
    @PutMapping("/admin/redemption/{redemptionId}/delivery")
    public ResponseEntity<?> addDeliveryInfo(
            @PathVariable String redemptionId,
            @RequestBody Map<String, String> deliveryInfo) {
        try {
            String info = deliveryInfo.get("deliveryInfo");
            if (info == null) {
                return ResponseEntity.badRequest().body("Delivery info is required");
            }

            UserReward userReward = rewardsService.addDeliveryInfo(redemptionId, info);
            return ResponseEntity.ok(userReward);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Error adding delivery info: " + e.getMessage());
        }
    }

    @PostMapping("/welcome-bonus/{userId}")
    public ResponseEntity<?> redeemWelcomeBonus(@PathVariable String userId) {
        try {
            PointTransaction transaction = rewardsService.redeemWelcomeBonus(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("pointsAwarded", transaction.getPoints());
            response.put("message", "Welcome bonus of 100 points has been added to your account!");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}