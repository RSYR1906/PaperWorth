// BudgetService.java
package sg.nus.iss.final_project.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import sg.nus.iss.final_project.model.Budget;
import sg.nus.iss.final_project.model.BudgetCategory;
import sg.nus.iss.final_project.repo.BudgetRepository;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    // Default budget distribution across categories (in percentages)
    private static final Map<String, Integer> DEFAULT_CATEGORY_PERCENTAGES = new HashMap<>();

    static {
        DEFAULT_CATEGORY_PERCENTAGES.put("Groceries", 30);
        DEFAULT_CATEGORY_PERCENTAGES.put("Dining", 20);
        DEFAULT_CATEGORY_PERCENTAGES.put("Fast Food", 10);
        DEFAULT_CATEGORY_PERCENTAGES.put("Cafes", 5);
        DEFAULT_CATEGORY_PERCENTAGES.put("Retail", 15);
        DEFAULT_CATEGORY_PERCENTAGES.put("Shopping", 10);
        DEFAULT_CATEGORY_PERCENTAGES.put("Healthcare", 5);
        DEFAULT_CATEGORY_PERCENTAGES.put("Others", 5);
    }

    // Get or create budget for a user and month
    @Cacheable(value = "budgets", key = "#userId + ':' + #monthYear")
    public Budget getUserBudget(String userId, String monthYear) {
        // If monthYear is not provided, use current month
        if (monthYear == null || monthYear.isEmpty()) {
            monthYear = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        }

        Optional<Budget> existingBudget = budgetRepository.findByUserIdAndMonthYear(userId, monthYear);

        if (existingBudget.isPresent()) {
            return existingBudget.get();
        } else {
            // Create a new default budget
            return createDefaultBudget(userId, monthYear);
        }
    }

    // Create a default budget with predefined categories
    private Budget createDefaultBudget(String userId, String monthYear) {
        // Default monthly budget amount
        double defaultTotalBudget = 1500.0;

        Budget budget = new Budget(userId, monthYear, defaultTotalBudget);

        // Create categories based on default percentages
        DEFAULT_CATEGORY_PERCENTAGES.forEach((categoryName, percentage) -> {
            double categoryBudget = defaultTotalBudget * (percentage / 100.0);
            BudgetCategory category = new BudgetCategory(categoryName, categoryBudget);
            budget.addCategory(category);
        });

        // Save and return the new budget
        return budgetRepository.save(budget);
    }

    // Save a budget
    @CachePut(value = "budgets", key = "#budget.userId + ':' + #budget.monthYear")
    public Budget saveBudget(Budget budget) {
        // Ensure totalSpent is accurate
        budget.updateTotalSpent();
        return budgetRepository.save(budget);
    }

    // Remove an expense from a budget
    @CacheEvict(value = "budgets", key = "#userId + ':' + #monthYear")
    public Budget removeExpenseFromBudget(String userId, String monthYear, String categoryName, double amount) {
        Budget budget = getUserBudget(userId, monthYear);

        BudgetCategory category = budget.findCategoryByName(categoryName);
        if (category != null) {
            // Subtract expense and decrement transaction count
            category.subtractExpense(amount);
        }

        // Update totalSpent
        budget.updateTotalSpent();

        return budgetRepository.save(budget);
    }

    // Update the total budget amount
    @CacheEvict(value = "budgets", key = "#userId + ':' + #monthYear")
    public Budget updateTotalBudget(String userId, String monthYear, double newBudgetAmount) {
        Budget budget = getUserBudget(userId, monthYear);
        budget.setTotalBudget(newBudgetAmount);

        // Recalculate category budgets based on the original distribution
        double originalTotal = budget.getTotalBudget();

        for (BudgetCategory category : budget.getCategories()) {
            // Calculate the percentage this category had in the original budget
            double originalPercentage = category.getBudgetAmount() / originalTotal * 100;

            // Apply the same percentage to the new total
            category.setBudgetAmount(newBudgetAmount * (originalPercentage / 100));
        }

        return budgetRepository.save(budget);
    }

    // Update a category's budget amount
    @CacheEvict(value = "budgets", key = "#userId + ':' + #monthYear")
    public Budget updateCategoryBudget(String userId, String monthYear, String categoryName, double newAmount) {
        Budget budget = getUserBudget(userId, monthYear);

        BudgetCategory category = budget.findCategoryByName(categoryName);
        if (category != null) {
            category.setBudgetAmount(newAmount);
        } else {
            // If category doesn't exist, create it
            budget.addCategory(new BudgetCategory(categoryName, newAmount));
        }

        return budgetRepository.save(budget);
    }

    // Add an expense to a budget
    @CacheEvict(value = "budgets", key = "#userId + ':' + #monthYear")
    public Budget addExpenseToBudget(String userId, String monthYear, String categoryName, double amount) {
        Budget budget = getUserBudget(userId, monthYear);

        BudgetCategory category = budget.findCategoryByName(categoryName);
        if (category != null) {
            // Update existing category
            category.addExpense(amount);
        } else {
            // Create a new category with a default budget (5% of total)
            double categoryBudget = budget.getTotalBudget() * 0.05;
            BudgetCategory newCategory = new BudgetCategory(categoryName, categoryBudget);
            newCategory.addExpense(amount);
            budget.addCategory(newCategory);
        }

        // Update totalSpent
        budget.updateTotalSpent();

        return budgetRepository.save(budget);
    }

    // Get all budgets for a user
    @Cacheable(value = "budgets", key = "#userId + ':all'")
    public List<Budget> getAllUserBudgets(String userId) {
        return budgetRepository.findByUserId(userId);
    }

    // Delete a budget
    @CacheEvict(value = "budgets", allEntries = true)
    public void deleteBudget(String budgetId) {
        budgetRepository.deleteById(budgetId);
    }
}