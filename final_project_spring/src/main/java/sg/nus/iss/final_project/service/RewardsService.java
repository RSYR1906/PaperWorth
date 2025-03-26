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

    private static final int BASE_POINTS_PER_RECEIPT = 0;
    private static final double POINTS_PER_DOLLAR = 1.0;

    public List<Reward> getAvailableRewards() {
        return rewardRepository.findByIsAvailableTrue();
    }

    public List<Reward> getRewardsByCategory(String category) {
        return rewardRepository.findByCategoryAndIsAvailableTrue(category);
    }

    public List<Reward> getAffordableRewards(String userId) {
        Optional<UserPoints> userPointsOpt = userPointsRepository.findByUserId(userId);
        if (userPointsOpt.isPresent()) {
            int availablePoints = userPointsOpt.get().getAvailablePoints();
            return rewardRepository.findByPointsCostLessThanEqualAndIsAvailableTrue(availablePoints);
        }
        return new ArrayList<>();
    }

    public Optional<Reward> getRewardById(String rewardId) {
        Reward reward = rewardRepository.findById(rewardId);
        return Optional.ofNullable(reward);
    }

    public UserPoints getUserPoints(String userId) {
        return userPointsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPoints newUserPoints = new UserPoints(userId, 0, 0, 0);
                    return userPointsRepository.save(newUserPoints);
                });
    }

    public List<UserReward> getUserRedemptionHistory(String userId) {
        return userRewardRepository.findByUserId(userId);
    }

    public List<PointTransaction> getUserPointTransactions(String userId) {
        return pointTransactionRepository.findByUserId(userId);
    }

    public List<PointTransaction> getUserRecentTransactions(String userId, int days) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(days);
        return pointTransactionRepository.findByUserIdAndTransactionDateAfterOrderByTransactionDateDesc(
                userId, fromDate);
    }

    @Transactional
    public PointTransaction awardPointsForReceipt(String receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId);

        if (receipt != null) {
            String userId = receipt.getUserId();

            int points = calculatePointsForReceipt(receipt);

            UserPoints userPoints = getUserPoints(userId);
            userPoints.addPoints(points);
            userPointsRepository.save(userPoints);

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

    private int calculatePointsForReceipt(Receipt receipt) {
        int points = BASE_POINTS_PER_RECEIPT;
        double totalExpense = receipt.getTotalExpense();
        points += (int) Math.floor(totalExpense * POINTS_PER_DOLLAR);
        return points;
    }

    @Transactional
    public UserReward redeemReward(String userId, String rewardId) throws Exception {
        UserPoints userPoints = getUserPoints(userId);
        Reward reward = rewardRepository.findById(rewardId);

        if (reward == null) {
            throw new Exception("Reward not found");
        }

        if (!reward.isAvailable() || reward.getQuantity() <= 0) {
            throw new Exception("This reward is no longer available");
        }

        if (userPoints.getAvailablePoints() < reward.getPointsCost()) {
            throw new Exception("Not enough points to redeem this reward");
        }

        boolean deducted = userPoints.spendPoints(reward.getPointsCost());

        if (!deducted) {
            throw new Exception("Failed to deduct points");
        }

        userPointsRepository.save(userPoints);

        reward.setQuantity(reward.getQuantity() - 1);

        if (reward.getQuantity() <= 0) {
            reward.setAvailable(false);
        }

        rewardRepository.save(reward);

        String redemptionCode = null;
        if ("VOUCHER".equals(reward.getCategory())) {
            redemptionCode = generateRedemptionCode();
        }

        UserReward userReward = new UserReward(
                userId,
                rewardId,
                reward.getName(),
                reward.getPointsCost(),
                "PENDING");

        if (redemptionCode != null) {
            userReward.setRedemptionCode(redemptionCode);
            userReward.setStatus("FULFILLED");

            if (reward.getExpiryDate() != null) {
                userReward.setExpiryDate(reward.getExpiryDate());
            } else {
                userReward.setExpiryDate(LocalDateTime.now().plusMonths(6));
            }
        }

        UserReward savedUserReward = userRewardRepository.save(userReward);

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

    private String generateRedemptionCode() {
        return "PW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public Reward addReward(Reward reward) {
        return rewardRepository.save(reward);
    }

    public Reward updateReward(String rewardId, Reward updatedReward) throws Exception {
        Reward existingReward = rewardRepository.findById(rewardId);

        if (existingReward == null) {
            throw new Exception("Reward not found");
        }

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

    public void deleteReward(String rewardId) throws Exception {
        if (rewardRepository.existsById(rewardId)) {
            rewardRepository.deleteById(rewardId);
        } else {
            throw new Exception("Reward not found");
        }
    }

    public UserReward updateRedemptionStatus(String redemptionId, String status) throws Exception {
        UserReward userReward = userRewardRepository.findById(redemptionId);

        if (userReward == null) {
            throw new Exception("Redemption record not found");
        }

        userReward.setStatus(status);
        return userRewardRepository.save(userReward);
    }

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
        List<PointTransaction> existingBonuses = pointTransactionRepository.findByUserIdAndSource(userId,
                "WELCOME_BONUS");

        if (!existingBonuses.isEmpty()) {
            throw new Exception("Welcome bonus has already been claimed");
        }

        UserPoints userPoints = getUserPoints(userId);
        userPoints.addPoints(100);
        userPointsRepository.save(userPoints);

        PointTransaction transaction = new PointTransaction(
                userId,
                100,
                "EARNED",
                "WELCOME_BONUS",
                userId,
                "Welcome bonus for joining PaperWorth!");

        UserReward welcomeBonus = new UserReward(
                userId,
                "welcome-bonus",
                "Welcome Bonus",
                0,
                "FULFILLED");
        welcomeBonus.setRedemptionCode("WELCOME100");
        userRewardRepository.save(welcomeBonus);

        return pointTransactionRepository.save(transaction);
    }
}