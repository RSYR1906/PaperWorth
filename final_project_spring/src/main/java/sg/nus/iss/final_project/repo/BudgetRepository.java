package sg.nus.iss.final_project.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import sg.nus.iss.final_project.model.Budget;

public interface BudgetRepository extends MongoRepository<Budget, String> {

    // Find a budget by user ID and month-year
    Optional<Budget> findByUserIdAndMonthYear(String userId, String monthYear);

    // Find all budgets for a specific user
    List<Budget> findByUserId(String userId);

    // Find all budgets for a specific month across all users
    List<Budget> findByMonthYear(String monthYear);

    // Find budgets where total spent is greater than budgeted amount
    @Query("{ 'totalSpent': { $gt: '$totalBudget' } }")
    List<Budget> findOverspentBudgets();

    // Find budgets by userId with a specific category
    @Query("{ 'userId': ?0, 'categories.category': ?1 }")
    List<Budget> findByUserIdAndCategory(String userId, String category);
}