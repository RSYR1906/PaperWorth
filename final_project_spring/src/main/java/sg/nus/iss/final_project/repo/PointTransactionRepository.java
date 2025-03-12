package sg.nus.iss.final_project.repo;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import sg.nus.iss.final_project.model.PointTransaction;

public interface PointTransactionRepository extends MongoRepository<PointTransaction, String> {
    // Find by user ID
    List<PointTransaction> findByUserId(String userId);

    // Find recent transactions
    List<PointTransaction> findByUserIdAndTransactionDateAfterOrderByTransactionDateDesc(
            String userId, LocalDateTime date);

    // Find by transaction type
    List<PointTransaction> findByUserIdAndTransactionType(String userId, String type);

    // Find by source
    List<PointTransaction> findByUserIdAndSource(String userId, String source);

    // Find by reference ID (e.g., receipt ID)
    List<PointTransaction> findByReferenceId(String referenceId);
}
