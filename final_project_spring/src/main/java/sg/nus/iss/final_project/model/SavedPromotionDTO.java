package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for saved promotions.
 * This combines information from both Promotion and SavedPromotion entities.
 */
public class SavedPromotionDTO {
    private String id; // Promotion ID
    private String merchant;
    private String description;
    private String expiry;
    private String imageUrl;
    private String location;
    private String code;
    private String conditions;
    private String category;
    private int promotionId;
    private LocalDateTime savedAt;
    private String savedPromotionId; // ID of the SavedPromotion record

    // Default constructor
    public SavedPromotionDTO() {
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMerchant() {
        return merchant;
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getExpiry() {
        return expiry;
    }

    public void setExpiry(String expiry) {
        this.expiry = expiry;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getConditions() {
        return conditions;
    }

    public void setConditions(String conditions) {
        this.conditions = conditions;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public int getPromotionId() {
        return promotionId;
    }

    public void setPromotionId(int promotionId) {
        this.promotionId = promotionId;
    }

    public LocalDateTime getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(LocalDateTime savedAt) {
        this.savedAt = savedAt;
    }

    public String getSavedPromotionId() {
        return savedPromotionId;
    }

    public void setSavedPromotionId(String savedPromotionId) {
        this.savedPromotionId = savedPromotionId;
    }
}