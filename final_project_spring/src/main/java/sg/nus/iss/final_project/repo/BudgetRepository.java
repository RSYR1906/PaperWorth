package sg.nus.iss.final_project.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.Budget;

@Repository
public class BudgetRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<Budget> findAll() {
        return mongoTemplate.findAll(Budget.class, "budgets");
    }

    public Budget findById(String id) {
        return mongoTemplate.findById(id, Budget.class, "budgets");
    }

    public Optional<Budget> findByIdOptional(String id) {
        Budget budget = mongoTemplate.findById(id, Budget.class, "budgets");
        return Optional.ofNullable(budget);
    }

    public Budget save(Budget budget) {
        return mongoTemplate.save(budget, "budgets");
    }

    public Optional<Budget> findByUserIdAndMonthYear(String userId, String monthYear) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("monthYear").is(monthYear));
        Budget budget = mongoTemplate.findOne(query, Budget.class, "budgets");
        return Optional.ofNullable(budget);
    }

    public List<Budget> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, Budget.class, "budgets");
    }

    public List<Budget> findByMonthYear(String monthYear) {
        Query query = new Query(Criteria.where("monthYear").is(monthYear));
        return mongoTemplate.find(query, Budget.class, "budgets");
    }

    public List<Budget> findOverspentBudgets() {
        Query query = new Query(Criteria.where("totalSpent").gt("totalBudget"));
        return mongoTemplate.find(query, Budget.class, "budgets");
    }

    public List<Budget> findByUserIdAndCategory(String userId, String category) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("categories.category").is(category));
        return mongoTemplate.find(query, Budget.class, "budgets");
    }

    public void delete(Budget budget) {
        mongoTemplate.remove(budget, "budgets");
    }

    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, Budget.class, "budgets");
    }

    public boolean existsById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        return mongoTemplate.exists(query, Budget.class, "budgets");
    }
}