package sg.nus.iss.final_project.model;

public class BudgetCategory {

    private String category;
    private double budgetAmount;
    private double spentAmount;
    private int transactions;

    // Default constructor
    public BudgetCategory() {
    }

    // Constructor with fields
    public BudgetCategory(String category, double budgetAmount) {
        this.category = category;
        this.budgetAmount = budgetAmount;
        this.spentAmount = 0;
        this.transactions = 0;
    }

    // Getters and Setters
    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public double getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(double budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public double getSpentAmount() {
        return spentAmount;
    }

    public void setSpentAmount(double spentAmount) {
        this.spentAmount = spentAmount;
    }

    public int getTransactions() {
        return transactions;
    }

    public void setTransactions(int transactions) {
        this.transactions = transactions;
    }

    // Helper method to add an expense
    public void addExpense(double amount) {
        this.spentAmount += amount;
        this.transactions++;
    }

    // Helper method to subtract an expense
    public void subtractExpense(double amount) {
        this.spentAmount = Math.max(0, this.spentAmount - amount);
        this.transactions = Math.max(0, this.transactions - 1);
    }

    @Override
    public String toString() {
        return "BudgetCategory [category=" + category + ", budgetAmount=" + budgetAmount + ", spentAmount="
                + spentAmount
                + ", transactions=" + transactions + "]";
    }
}