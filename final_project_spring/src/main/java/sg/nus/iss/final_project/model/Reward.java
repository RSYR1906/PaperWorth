package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "rewards")
public class Reward {
    @Id
    private String id;
    private String name;
    private String description;
    private int pointsCost;
    private String imageUrl;
    private String category; // "VOUCHER", "ELECTRONICS", etc.
    private boolean isAvailable;
    private int quantity;
    private String merchantName; // For vouchers
    private String termsConditions;
    private LocalDateTime expiryDate; // For vouchers

    // Default constructor
    public Reward() {
    }

    // Constructor with fields
    public Reward(String name, String description, int pointsCost, String imageUrl,
            String category, boolean isAvailable, int quantity,
            String merchantName, String termsConditions, LocalDateTime expiryDate) {
        this.name = name;
        this.description = description;
        this.pointsCost = pointsCost;
        this.imageUrl = imageUrl;
        this.category = category;
        this.isAvailable = isAvailable;
        this.quantity = quantity;
        this.merchantName = merchantName;
        this.termsConditions = termsConditions;
        this.expiryDate = expiryDate;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getPointsCost() {
        return pointsCost;
    }

    public void setPointsCost(int pointsCost) {
        this.pointsCost = pointsCost;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean isAvailable() {
        return isAvailable;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getTermsConditions() {
        return termsConditions;
    }

    public void setTermsConditions(String termsConditions) {
        this.termsConditions = termsConditions;
    }

    public LocalDateTime getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDateTime expiryDate) {
        this.expiryDate = expiryDate;
    }

    @Override
    public String toString() {
        return "Reward{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", pointsCost=" + pointsCost +
                ", category='" + category + '\'' +
                ", isAvailable=" + isAvailable +
                ", quantity=" + quantity +
                ", merchantName='" + merchantName + '\'' +
                '}';
    }
}