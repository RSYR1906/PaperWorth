package sg.nus.iss.final_project.repo;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.PointTransaction;

@Repository
public class PointTransactionRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    // Find all point transactions
    public List<PointTransaction> findAll() {
        return mongoTemplate.findAll(PointTransaction.class);
    }

    // Find point transaction by ID
    public PointTransaction findById(String id) {
        return mongoTemplate.findById(id, PointTransaction.class);
    }

    // Find by ID with Optional wrapper
    public java.util.Optional<PointTransaction> findByIdOptional(String id) {
        PointTransaction transaction = mongoTemplate.findById(id, PointTransaction.class);
        return java.util.Optional.ofNullable(transaction);
    }

    // Save point transaction
    public PointTransaction save(PointTransaction transaction) {
        return mongoTemplate.save(transaction);
    }

    // Find by user ID
    public List<PointTransaction> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, PointTransaction.class);
    }

    // Find recent transactions
    public List<PointTransaction> findByUserIdAndTransactionDateAfterOrderByTransactionDateDesc(
            String userId, LocalDateTime date) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("transactionDate").gt(date))
                .with(Sort.by(Sort.Direction.DESC, "transactionDate"));
        return mongoTemplate.find(query, PointTransaction.class);
    }

    // Find by transaction type
    public List<PointTransaction> findByUserIdAndTransactionType(String userId, String type) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("transactionType").is(type));
        return mongoTemplate.find(query, PointTransaction.class);
    }

    // Find by source
    public List<PointTransaction> findByUserIdAndSource(String userId, String source) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("source").is(source));
        return mongoTemplate.find(query, PointTransaction.class);
    }

    // Find by reference ID (e.g., receipt ID)
    public List<PointTransaction> findByReferenceId(String referenceId) {
        Query query = new Query(Criteria.where("referenceId").is(referenceId));
        return mongoTemplate.find(query, PointTransaction.class);
    }

    // Delete a point transaction
    public void delete(PointTransaction transaction) {
        mongoTemplate.remove(transaction);
    }

    // Delete a point transaction by ID
    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, PointTransaction.class);
    }
}