package sg.nus.iss.final_project.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.Budget;
import sg.nus.iss.final_project.service.BudgetService;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    // Get a budget for a specific user and month
    @GetMapping("/user/{userId}/month/{monthYear}")
    public ResponseEntity<Budget> getUserBudget(@PathVariable String userId, @PathVariable String monthYear) {
        Budget budget = budgetService.getUserBudget(userId, monthYear);
        return ResponseEntity.ok(budget);
    }

    // Get all budgets for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Budget>> getAllUserBudgets(@PathVariable String userId) {
        List<Budget> budgets = budgetService.getAllUserBudgets(userId);
        return ResponseEntity.ok(budgets);
    }

    // Create or update an entire budget
    @PostMapping("")
    public ResponseEntity<Budget> saveBudget(@RequestBody Budget budget) {
        Budget savedBudget = budgetService.saveBudget(budget);
        return ResponseEntity.ok(savedBudget);
    }

    // Update total budget amount
    @PutMapping("/user/{userId}/month/{monthYear}/total")
    public ResponseEntity<Budget> updateTotalBudget(
            @PathVariable String userId,
            @PathVariable String monthYear,
            @RequestBody Map<String, Double> budgetRequest) {

        Double amount = budgetRequest.get("amount");
        if (amount == null) {
            return ResponseEntity.badRequest().build();
        }

        Budget updatedBudget = budgetService.updateTotalBudget(userId, monthYear, amount);
        return ResponseEntity.ok(updatedBudget);
    }

    // Update a category budget
    @PutMapping("/user/{userId}/month/{monthYear}/category/{categoryName}")
    public ResponseEntity<Budget> updateCategoryBudget(
            @PathVariable String userId,
            @PathVariable String monthYear,
            @PathVariable String categoryName,
            @RequestBody Map<String, Double> budgetRequest) {

        Double amount = budgetRequest.get("amount");
        if (amount == null) {
            return ResponseEntity.badRequest().build();
        }

        Budget updatedBudget = budgetService.updateCategoryBudget(userId, monthYear, categoryName, amount);
        return ResponseEntity.ok(updatedBudget);
    }

    // Add an expense to the budget
    @PostMapping("/user/{userId}/month/{monthYear}/expense")
    public ResponseEntity<Budget> addExpense(
            @PathVariable String userId,
            @PathVariable String monthYear,
            @RequestBody Map<String, Object> expenseRequest) {

        String category = (String) expenseRequest.get("category");
        Double amount = ((Number) expenseRequest.get("amount")).doubleValue();

        if (category == null || amount == null) {
            return ResponseEntity.badRequest().build();
        }

        Budget updatedBudget = budgetService.addExpenseToBudget(userId, monthYear, category, amount);
        return ResponseEntity.ok(updatedBudget);
    }

    // Delete a budget
    @DeleteMapping("/{budgetId}")
    public ResponseEntity<Void> deleteBudget(@PathVariable String budgetId) {
        budgetService.deleteBudget(budgetId);
        return ResponseEntity.noContent().build();
    }
}