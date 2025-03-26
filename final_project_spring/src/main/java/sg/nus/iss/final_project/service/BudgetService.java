// BudgetService.java
package sg.nus.iss.final_project.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import sg.nus.iss.final_project.model.Budget;
import sg.nus.iss.final_project.model.BudgetCategory;
import sg.nus.iss.final_project.repo.BudgetRepository;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

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


    public Budget getUserBudget(String userId, String monthYear) {
        if (monthYear == null || monthYear.isEmpty()) {
            monthYear = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        }

        Optional<Budget> existingBudget = budgetRepository.findByUserIdAndMonthYear(userId, monthYear);

        if (existingBudget.isPresent()) {
            return existingBudget.get();
        } else {
            return createDefaultBudget(userId, monthYear);
        }
    }

    private Budget createDefaultBudget(String userId, String monthYear) {
        double defaultTotalBudget = 1500.0;
        Budget budget = new Budget(userId, monthYear, defaultTotalBudget);

        DEFAULT_CATEGORY_PERCENTAGES.forEach((categoryName, percentage) -> {
            double categoryBudget = defaultTotalBudget * (percentage / 100.0);
            BudgetCategory category = new BudgetCategory(categoryName, categoryBudget);
            budget.addCategory(category);
        });
        return budgetRepository.save(budget);
    }

    public Budget saveBudget(Budget budget) {
        budget.updateTotalSpent();
        return budgetRepository.save(budget);
    }

    public Budget removeExpenseFromBudget(String userId, String monthYear, String categoryName, double amount) {
        Budget budget = getUserBudget(userId, monthYear);

        BudgetCategory category = budget.findCategoryByName(categoryName);
        if (category != null) {
            category.subtractExpense(amount);
        }
        budget.updateTotalSpent();
        return budgetRepository.save(budget);
    }

    public Budget updateTotalBudget(String userId, String monthYear, double newBudgetAmount) {
        Budget budget = getUserBudget(userId, monthYear);
        budget.setTotalBudget(newBudgetAmount);

        double originalTotal = budget.getTotalBudget();

        for (BudgetCategory category : budget.getCategories()) {
            double originalPercentage = category.getBudgetAmount() / originalTotal * 100;
            category.setBudgetAmount(newBudgetAmount * (originalPercentage / 100));
        }
        return budgetRepository.save(budget);
    }

    public Budget updateCategoryBudget(String userId, String monthYear, String categoryName, double newAmount) {
        Budget budget = getUserBudget(userId, monthYear);

        BudgetCategory category = budget.findCategoryByName(categoryName);
        if (category != null) {
            category.setBudgetAmount(newAmount);
        } else {
            budget.addCategory(new BudgetCategory(categoryName, newAmount));
        }

        return budgetRepository.save(budget);
    }

    public Budget addExpenseToBudget(String userId, String monthYear, String categoryName, double amount) {
        Budget budget = getUserBudget(userId, monthYear);

        BudgetCategory category = budget.findCategoryByName(categoryName);
        if (category != null) {
            category.addExpense(amount);
        } else {
            double categoryBudget = budget.getTotalBudget() * 0.05;
            BudgetCategory newCategory = new BudgetCategory(categoryName, categoryBudget);
            newCategory.addExpense(amount);
            budget.addCategory(newCategory);
        }
        budget.updateTotalSpent();
        return budgetRepository.save(budget);
    }

    public List<Budget> getAllUserBudgets(String userId) {
        return budgetRepository.findByUserId(userId);
    }

    public void deleteBudget(String budgetId) {
        budgetRepository.deleteById(budgetId);
    }
}