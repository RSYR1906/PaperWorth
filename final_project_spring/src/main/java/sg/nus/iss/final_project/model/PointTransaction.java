package sg.nus.iss.final_project.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "pointTransactions")
public class PointTransaction {
    @Id
    private String id;
    private String userId;
    private int points;
    private String transactionType; // "EARNED", "SPENT"
    private String source; // "RECEIPT_SCAN", "REWARD_REDEMPTION", etc.
    private String referenceId; // Receipt ID or Reward ID
    private LocalDateTime transactionDate;
    private String description;

    public PointTransaction() {
    }

    public PointTransaction(String userId, int points, String transactionType,
            String source, String referenceId, String description) {
        this.userId = userId;
        this.points = points;
        this.transactionType = transactionType;
        this.source = source;
        this.referenceId = referenceId;
        this.transactionDate = LocalDateTime.now();
        this.description = description;
    }

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

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return "PointTransaction{" +
                "id='" + id + '\'' +
                ", userId='" + userId + '\'' +
                ", points=" + points +
                ", transactionType='" + transactionType + '\'' +
                ", source='" + source + '\'' +
                ", referenceId='" + referenceId + '\'' +
                ", transactionDate=" + transactionDate +
                '}';
    }
}
