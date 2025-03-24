package sg.nus.iss.final_project.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.UserReward;
import sg.nus.iss.final_project.repo.UserRewardRepository;

@RestController
@RequestMapping("/api/user-rewards")
public class UserRewardController {

    @Autowired
    private UserRewardRepository userRewardRepository;

    // Get all rewards for a user
    @GetMapping("/{userId}")
    public ResponseEntity<List<UserReward>> getUserRewards(@PathVariable String userId) {
        List<UserReward> rewards = userRewardRepository.findByUserId(userId);
        return ResponseEntity.ok(rewards);
    }

    // Get rewards by status (PENDING, FULFILLED, CANCELLED)
    @GetMapping("/{userId}/status/{status}")
    public ResponseEntity<List<UserReward>> getUserRewardsByStatus(
            @PathVariable String userId,
            @PathVariable String status) {
        List<UserReward> rewards = userRewardRepository.findByUserIdAndStatus(userId, status);
        return ResponseEntity.ok(rewards);
    }

    // Get recent rewards (redeemed in last N days)
    @GetMapping("/{userId}/recent")
    public ResponseEntity<List<UserReward>> getRecentUserRewards(
            @PathVariable String userId,
            @RequestParam(defaultValue = "30") int days) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(days);
        List<UserReward> rewards = userRewardRepository.findByUserIdAndRedeemedDateAfter(userId, fromDate);
        return ResponseEntity.ok(rewards);
    }

    // Get expiring rewards (e.g., vouchers expiring soon)
    @GetMapping("/{userId}/expiring")
    public ResponseEntity<List<UserReward>> getExpiringUserRewards(
            @PathVariable String userId,
            @RequestParam(defaultValue = "30") int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime future = now.plusDays(days);
        List<UserReward> rewards = userRewardRepository.findByUserIdAndStatusAndExpiryDateBetween(
                userId, "FULFILLED", now, future);
        return ResponseEntity.ok(rewards);
    }
}