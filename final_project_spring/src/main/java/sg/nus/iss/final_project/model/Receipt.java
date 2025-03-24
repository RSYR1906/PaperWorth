package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Receipt model for storing receipt information in MongoDB
 * Standardized to match frontend model
 */
@Document(collection = "receipts")
public class Receipt {
    @Id
    private String id;
    private String userId;
    private String merchantName;
    private LocalDateTime dateOfPurchase;
    private double totalExpense; // Standardized from totalAmount in some places
    private String category;
    private String imageUrl;
    private String[] items;
    private LocalDateTime scanDate; // Added to track when receipt was scanned

    // Default constructor
    public Receipt() {
    }

    // Constructor with fields
    public Receipt(String userId, String merchantName, LocalDateTime dateOfPurchase,
            double totalExpense, String category) {
        this.userId = userId;
        this.merchantName = merchantName;
        this.dateOfPurchase = dateOfPurchase;
        this.totalExpense = totalExpense;
        this.category = category;
        this.scanDate = LocalDateTime.now(); // Set scan date to current time
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

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public LocalDateTime getDateOfPurchase() {
        return dateOfPurchase;
    }

    public void setDateOfPurchase(LocalDateTime dateOfPurchase) {
        this.dateOfPurchase = dateOfPurchase;
    }

    public double getTotalExpense() {
        return totalExpense;
    }

    public void setTotalExpense(double totalExpense) {
        this.totalExpense = totalExpense;
    }

    // Backward compatibility method for totalAmount
    public double getTotalAmount() {
        return totalExpense;
    }

    // Backward compatibility method for totalAmount
    public void setTotalAmount(double totalAmount) {
        this.totalExpense = totalAmount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String[] getItems() {
        return items;
    }

    public void setItems(String[] items) {
        this.items = items;
    }

    public LocalDateTime getScanDate() {
        return scanDate;
    }

    public void setScanDate(LocalDateTime scanDate) {
        this.scanDate = scanDate;
    }

    @Override
    public String toString() {
        return "Receipt [id=" + id + ", userId=" + userId + ", merchantName=" + merchantName + ", dateOfPurchase="
                + dateOfPurchase + ", totalExpense=" + totalExpense + ", category=" + category + "]";
    }
}