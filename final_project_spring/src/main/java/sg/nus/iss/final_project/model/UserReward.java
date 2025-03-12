package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "userRewards")
public class UserReward {
    @Id
    private String id;
    private String userId;
    private String rewardId;
    private String rewardName;
    private int pointsSpent;
    private LocalDateTime redeemedDate;
    private String status; // "PENDING", "FULFILLED", "CANCELLED"
    private String redemptionCode; // For digital rewards/vouchers
    private String deliveryInfo; // For physical rewards
    private LocalDateTime expiryDate; // For vouchers

    // Default constructor
    public UserReward() {
    }

    // Constructor with fields
    public UserReward(String userId, String rewardId, String rewardName,
            int pointsSpent, String status) {
        this.userId = userId;
        this.rewardId = rewardId;
        this.rewardName = rewardName;
        this.pointsSpent = pointsSpent;
        this.redeemedDate = LocalDateTime.now();
        this.status = status;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRewardId() {
        return rewardId;
    }

    public void setRewardId(String rewardId) {
        this.rewardId = rewardId;
    }

    public String getRewardName() {
        return rewardName;
    }

    public void setRewardName(String rewardName) {
        this.rewardName = rewardName;
    }

    public int getPointsSpent() {
        return pointsSpent;
    }

    public void setPointsSpent(int pointsSpent) {
        this.pointsSpent = pointsSpent;
    }

    public LocalDateTime getRedeemedDate() {
        return redeemedDate;
    }

    public void setRedeemedDate(LocalDateTime redeemedDate) {
        this.redeemedDate = redeemedDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRedemptionCode() {
        return redemptionCode;
    }

    public void setRedemptionCode(String redemptionCode) {
        this.redemptionCode = redemptionCode;
    }

    public String getDeliveryInfo() {
        return deliveryInfo;
    }

    public void setDeliveryInfo(String deliveryInfo) {
        this.deliveryInfo = deliveryInfo;
    }

    public LocalDateTime getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDateTime expiryDate) {
        this.expiryDate = expiryDate;
    }

    @Override
    public String toString() {
        return "UserReward{" +
                "id='" + id + '\'' +
                ", userId='" + userId + '\'' +
                ", rewardId='" + rewardId + '\'' +
                ", rewardName='" + rewardName + '\'' +
                ", pointsSpent=" + pointsSpent +
                ", redeemedDate=" + redeemedDate +
                ", status='" + status + '\'' +
                '}';
    }
}