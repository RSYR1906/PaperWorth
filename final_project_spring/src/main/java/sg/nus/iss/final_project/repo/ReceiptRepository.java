package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import sg.nus.iss.final_project.model.Receipt;

@Repository
public interface ReceiptRepository extends MongoRepository<Receipt, String> {
    // Find receipts by user ID
    List<Receipt> findByUserId(String userId);

    // Add a custom query to find by userId with debug
    @Query(value = "{ 'userId': ?0 }")
    List<Receipt> findReceiptsByUserId(String userId);

    // Find recent receipts sorted by date
    @Query(value = "{ 'userId': ?0 }", sort = "{ 'dateOfPurchase': -1 }")
    List<Receipt> findRecentByUserId(String userId);

    // Count receipts by userId
    long countByUserId(String userId);
}