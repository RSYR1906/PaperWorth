package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "userPoints")
public class UserPoints {
    @Id
    private String id;
    private String userId;
    private int totalPoints;
    private int availablePoints;
    private int spentPoints;
    private LocalDateTime lastUpdated;

    // Default constructor
    public UserPoints() {
    }

    // Constructor with fields
    public UserPoints(String userId, int totalPoints, int availablePoints, int spentPoints) {
        this.userId = userId;
        this.totalPoints = totalPoints;
        this.availablePoints = availablePoints;
        this.spentPoints = spentPoints;
        this.lastUpdated = LocalDateTime.now();
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

    public int getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(int totalPoints) {
        this.totalPoints = totalPoints;
    }

    public int getAvailablePoints() {
        return availablePoints;
    }

    public void setAvailablePoints(int availablePoints) {
        this.availablePoints = availablePoints;
    }

    public int getSpentPoints() {
        return spentPoints;
    }

    public void setSpentPoints(int spentPoints) {
        this.spentPoints = spentPoints;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    // Helper methods
    public void addPoints(int points) {
        this.totalPoints += points;
        this.availablePoints += points;
        this.lastUpdated = LocalDateTime.now();
    }

    public boolean spendPoints(int points) {
        if (this.availablePoints >= points) {
            this.availablePoints -= points;
            this.spentPoints += points;
            this.lastUpdated = LocalDateTime.now();
            return true;
        }
        return false;
    }

    @Override
    public String toString() {
        return "UserPoints{" +
                "id='" + id + '\'' +
                ", userId='" + userId + '\'' +
                ", totalPoints=" + totalPoints +
                ", availablePoints=" + availablePoints +
                ", spentPoints=" + spentPoints +
                ", lastUpdated=" + lastUpdated +
                '}';
    }
}