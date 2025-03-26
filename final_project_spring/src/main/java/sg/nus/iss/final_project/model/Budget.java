package sg.nus.iss.final_project.model;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "budgets")
@CompoundIndex(name = "user_month_idx", def = "{'userId': 1, 'monthYear': 1}", unique = true)
public class Budget {

    @Id
    private String id;

    private String userId;
    private String monthYear; // Format: YYYY-MM
    private double totalBudget;
    private double totalSpent;
    private List<BudgetCategory> categories = new ArrayList<>();

    public Budget() {
    }

    public Budget(String userId, String monthYear, double totalBudget) {
        this.userId = userId;
        this.monthYear = monthYear;
        this.totalBudget = totalBudget;
        this.totalSpent = 0;
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

    public String getMonthYear() {
        return monthYear;
    }

    public void setMonthYear(String monthYear) {
        this.monthYear = monthYear;
    }

    public double getTotalBudget() {
        return totalBudget;
    }

    public void setTotalBudget(double totalBudget) {
        this.totalBudget = totalBudget;
    }

    public double getTotalSpent() {
        return totalSpent;
    }

    public void setTotalSpent(double totalSpent) {
        this.totalSpent = totalSpent;
    }

    public List<BudgetCategory> getCategories() {
        return categories;
    }

    public void setCategories(List<BudgetCategory> categories) {
        this.categories = categories;
    }

    public void addCategory(BudgetCategory category) {
        this.categories.add(category);
    }

    public void updateTotalSpent() {
        this.totalSpent = this.categories.stream()
                .mapToDouble(BudgetCategory::getSpentAmount)
                .sum();
    }

    public BudgetCategory findCategoryByName(String categoryName) {
        return this.categories.stream()
                .filter(c -> c.getCategory().equalsIgnoreCase(categoryName))
                .findFirst()
                .orElse(null);
    }

    @Override
    public String toString() {
        return "Budget [id=" + id + ", userId=" + userId + ", monthYear=" + monthYear + ", totalBudget=" + totalBudget
                + ", totalSpent=" + totalSpent + ", categories=" + categories + "]";
    }
}