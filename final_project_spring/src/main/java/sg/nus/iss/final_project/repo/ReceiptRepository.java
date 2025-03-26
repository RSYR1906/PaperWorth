package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.Receipt;

@Repository
public class ReceiptRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<Receipt> findAll() {
        return mongoTemplate.findAll(Receipt.class, "receipts");
    }

    public Receipt findById(String id) {
        return mongoTemplate.findById(id, Receipt.class, "receipts");
    }

    public java.util.Optional<Receipt> findByIdOptional(String id) {
        Receipt receipt = mongoTemplate.findById(id, Receipt.class, "receipts");
        return java.util.Optional.ofNullable(receipt);
    }

    public Receipt save(Receipt receipt) {
        return mongoTemplate.save(receipt);
    }

    public List<Receipt> findByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, Receipt.class, "receipts");
    }

    public List<Receipt> findReceiptsByUserId(String userId) {
        System.out.println("Executing findReceiptsByUserId with userId: " + userId);
        Query query = new Query(Criteria.where("userId").is(userId));
        List<Receipt> results = mongoTemplate.find(query, Receipt.class, "receipts");
        System.out.println("Found " + results.size() + " receipts");
        return results;
    }

    public List<Receipt> findRecentByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId))
                .with(Sort.by(Sort.Direction.DESC, "dateOfPurchase"));
        return mongoTemplate.find(query, Receipt.class, "receipts");
    }

    public long countByUserId(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.count(query, Receipt.class, "receipts");
    }

    public long count() {
        return mongoTemplate.count(new Query(), Receipt.class, "receipts");
    }

    public void delete(Receipt receipt) {
        mongoTemplate.remove(receipt);
    }

    public void deleteById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        mongoTemplate.remove(query, Receipt.class, "receipts");
    }

    public boolean existsById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        return mongoTemplate.exists(query, Receipt.class, "receipts");
    }
}