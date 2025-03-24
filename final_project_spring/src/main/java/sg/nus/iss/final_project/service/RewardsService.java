package sg.nus.iss.final_project.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.iss.final_project.model.PointTransaction;
import sg.nus.iss.final_project.model.Receipt;
import sg.nus.iss.final_project.model.Reward;
import sg.nus.iss.final_project.model.UserPoints;
import sg.nus.iss.final_project.model.UserReward;
import sg.nus.iss.final_project.repo.PointTransactionRepository;
import sg.nus.iss.final_project.repo.ReceiptRepository;
import sg.nus.iss.final_project.repo.RewardRepository;
import sg.nus.iss.final_project.repo.UserPointsRepository;
import sg.nus.iss.final_project.repo.UserRewardRepository;

@Service
public class RewardsService {

    @Autowired
    private RewardRepository rewardRepository;

    @Autowired
    private UserPointsRepository userPointsRepository;

    @Autowired
    private UserRewardRepository userRewardRepository;

    @Autowired
    private PointTransactionRepository pointTransactionRepository;

    @Autowired
    private ReceiptRepository receiptRepository;

    // Point calculation constants
    private static final int BASE_POINTS_PER_RECEIPT = 0;
    private static final double POINTS_PER_DOLLAR = 1.0;

    // Get available rewards
    public List<Reward> getAvailableRewards() {
        return rewardRepository.findByIsAvailableTrue();
    }

    // Get rewards by category
    public List<Reward> getRewardsByCategory(String category) {
        return rewardRepository.findByCategoryAndIsAvailableTrue(category);
    }

    // Get rewards affordable by user
    public List<Reward> getAffordableRewards(String userId) {
        Optional<UserPoints> userPointsOpt = userPointsRepository.findByUserId(userId);
        if (userPointsOpt.isPresent()) {
            int availablePoints = userPointsOpt.get().getAvailablePoints();
            return rewardRepository.findByPointsCostLessThanEqualAndIsAvailableTrue(availablePoints);
        }
        return new ArrayList<>();
    }

    // Get a specific reward
    public Optional<Reward> getRewardById(String rewardId) {
        Reward reward = rewardRepository.findById(rewardId);
        return Optional.ofNullable(reward);
    }

    // Get user points
    public UserPoints getUserPoints(String userId) {
        return userPointsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // Create new user points record if not exists
                    UserPoints newUserPoints = new UserPoints(userId, 0, 0, 0);
                    return userPointsRepository.save(newUserPoints);
                });
    }

    // Get user's redemption history
    public List<UserReward> getUserRedemptionHistory(String userId) {
        return userRewardRepository.findByUserId(userId);
    }

    // Get user's point transactions
    public List<PointTransaction> getUserPointTransactions(String userId) {
        return pointTransactionRepository.findByUserId(userId);
    }

    // Get user's recent point transactions
    public List<PointTransaction> getUserRecentTransactions(String userId, int days) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(days);
        return pointTransactionRepository.findByUserIdAndTransactionDateAfterOrderByTransactionDateDesc(
                userId, fromDate);
    }

    // Award points for scanning a receipt
    @Transactional
    public PointTransaction awardPointsForReceipt(String receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId);

        if (receipt != null) {
            String userId = receipt.getUserId();

            // Calculate points based on receipt total
            int points = calculatePointsForReceipt(receipt);

            // Update user points
            UserPoints userPoints = getUserPoints(userId);
            userPoints.addPoints(points);
            userPointsRepository.save(userPoints);

            // Create point transaction record
            PointTransaction transaction = new PointTransaction(
                    userId,
                    points,
                    "EARNED",
                    "RECEIPT_SCAN",
                    receiptId,
                    "Points earned from scanning receipt at " + receipt.getMerchantName());

            return pointTransactionRepository.save(transaction);
        }

        return null;
    }

    // Calculate points for a receipt
    private int calculatePointsForReceipt(Receipt receipt) {
        // Base points for any receipt
        int points = BASE_POINTS_PER_RECEIPT;

        // Additional points based on receipt total
        double totalExpense = receipt.getTotalExpense();
        points += (int) Math.floor(totalExpense * POINTS_PER_DOLLAR);

        return points;
    }

    // Redeem a reward
    @Transactional
    public UserReward redeemReward(String userId, String rewardId) throws Exception {
        // Get user points
        UserPoints userPoints = getUserPoints(userId);

        // Get the reward
        Reward reward = rewardRepository.findById(rewardId);

        if (reward == null) {
            throw new Exception("Reward not found");
        }

        // Check if reward is available
        if (!reward.isAvailable() || reward.getQuantity() <= 0) {
            throw new Exception("This reward is no longer available");
        }

        // Check if user has enough points
        if (userPoints.getAvailablePoints() < reward.getPointsCost()) {
            throw new Exception("Not enough points to redeem this reward");
        }

        // Deduct points from user
        boolean deducted = userPoints.spendPoints(reward.getPointsCost());

        if (!deducted) {
            throw new Exception("Failed to deduct points");
        }

        // Update user points
        userPointsRepository.save(userPoints);

        // Decrease reward quantity
        reward.setQuantity(reward.getQuantity() - 1);

        // If quantity reaches 0, mark as unavailable
        if (reward.getQuantity() <= 0) {
            reward.setAvailable(false);
        }

        // Update reward
        rewardRepository.save(reward);

        // Generate redemption code for vouchers
        String redemptionCode = null;
        if ("VOUCHER".equals(reward.getCategory())) {
            redemptionCode = generateRedemptionCode();
        }

        // Create user reward record
        UserReward userReward = new UserReward(
                userId,
                rewardId,
                reward.getName(),
                reward.getPointsCost(),
                "PENDING");

        // Set redemption code for vouchers
        if (redemptionCode != null) {
            userReward.setRedemptionCode(redemptionCode);
            userReward.setStatus("FULFILLED");

            // Set expiry date for vouchers (e.g., 6 months from now)
            if (reward.getExpiryDate() != null) {
                userReward.setExpiryDate(reward.getExpiryDate());
            } else {
                userReward.setExpiryDate(LocalDateTime.now().plusMonths(6));
            }
        }

        // Save user reward
        UserReward savedUserReward = userRewardRepository.save(userReward);

        // Create point transaction record
        PointTransaction transaction = new PointTransaction(
                userId,
                reward.getPointsCost(),
                "SPENT",
                "REWARD_REDEMPTION",
                rewardId,
                "Points spent on redeeming " + reward.getName());

        pointTransactionRepository.save(transaction);

        return savedUserReward;
    }

    // Generate a random redemption code
    private String generateRedemptionCode() {
        return "PW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    // Add a new reward (admin function)
    public Reward addReward(Reward reward) {
        return rewardRepository.save(reward);
    }

    // Update a reward (admin function)
    public Reward updateReward(String rewardId, Reward updatedReward) throws Exception {
        Reward existingReward = rewardRepository.findById(rewardId);

        if (existingReward == null) {
            throw new Exception("Reward not found");
        }

        // Update fields
        existingReward.setName(updatedReward.getName());
        existingReward.setDescription(updatedReward.getDescription());
        existingReward.setPointsCost(updatedReward.getPointsCost());
        existingReward.setImageUrl(updatedReward.getImageUrl());
        existingReward.setCategory(updatedReward.getCategory());
        existingReward.setAvailable(updatedReward.isAvailable());
        existingReward.setQuantity(updatedReward.getQuantity());
        existingReward.setMerchantName(updatedReward.getMerchantName());
        existingReward.setTermsConditions(updatedReward.getTermsConditions());
        existingReward.setExpiryDate(updatedReward.getExpiryDate());

        return rewardRepository.save(existingReward);
    }

    // Delete a reward (admin function)
    public void deleteReward(String rewardId) throws Exception {
        if (rewardRepository.existsById(rewardId)) {
            rewardRepository.deleteById(rewardId);
        } else {
            throw new Exception("Reward not found");
        }
    }

    // Update redemption status (admin function)
    public UserReward updateRedemptionStatus(String redemptionId, String status) throws Exception {
        UserReward userReward = userRewardRepository.findById(redemptionId);

        if (userReward == null) {
            throw new Exception("Redemption record not found");
        }

        userReward.setStatus(status);
        return userRewardRepository.save(userReward);
    }

    // Add tracking/delivery info to a redemption (admin function)
    public UserReward addDeliveryInfo(String redemptionId, String deliveryInfo) throws Exception {
        UserReward userReward = userRewardRepository.findById(redemptionId);

        if (userReward == null) {
            throw new Exception("Redemption record not found");
        }

        userReward.setDeliveryInfo(deliveryInfo);
        return userRewardRepository.save(userReward);
    }

    @Transactional
    public PointTransaction redeemWelcomeBonus(String userId) throws Exception {
        // Check if user has already claimed welcome bonus
        List<PointTransaction> existingBonuses = pointTransactionRepository.findByUserIdAndSource(userId,
                "WELCOME_BONUS");

        if (!existingBonuses.isEmpty()) {
            throw new Exception("Welcome bonus has already been claimed");
        }

        // Update user points
        UserPoints userPoints = getUserPoints(userId);
        userPoints.addPoints(100);
        userPointsRepository.save(userPoints);

        // Create point transaction record
        PointTransaction transaction = new PointTransaction(
                userId,
                100,
                "EARNED",
                "WELCOME_BONUS",
                userId,
                "Welcome bonus for joining PaperWorth!");

        // Create a UserReward for the welcome bonus, explicitly set as FULFILLED
        UserReward welcomeBonus = new UserReward(
                userId,
                "welcome-bonus", // Use a special ID for welcome bonus
                "Welcome Bonus",
                0, // No points spent
                "FULFILLED");
        welcomeBonus.setRedemptionCode("WELCOME100"); // Optional: add a fixed redemption code
        userRewardRepository.save(welcomeBonus);

        return pointTransactionRepository.save(transaction);
    }
}