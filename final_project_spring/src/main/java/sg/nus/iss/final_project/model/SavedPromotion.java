package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "savedPromotions")
@CompoundIndex(name = "user_promotion_idx", def = "{'userId': 1, 'promotionId': 1}", unique = true)
public class SavedPromotion {
    @Id
    private String id;
    private String userId;
    private String promotionId;
    private LocalDateTime savedAt;

    // Default constructor
    public SavedPromotion() {
    }

    // Constructor with fields
    public SavedPromotion(String userId, String promotionId) {
        this.userId = userId;
        this.promotionId = promotionId;
        this.savedAt = LocalDateTime.now();
    }

    // Getters and setters
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

    public String getPromotionId() {
        return promotionId;
    }

    public void setPromotionId(String promotionId) {
        this.promotionId = promotionId;
    }

    public LocalDateTime getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(LocalDateTime savedAt) {
        this.savedAt = savedAt;
    }

    @Override
    public String toString() {
        return "SavedPromotion [id=" + id + ", userId=" + userId + ", promotionId=" + promotionId + ", savedAt="
                + savedAt + "]";
    }
}