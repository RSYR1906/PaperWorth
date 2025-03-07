package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import sg.nus.iss.final_project.model.Receipt;

public interface ReceiptRepository extends MongoRepository<Receipt, String> {
    List<Receipt> findByUserId(String userId);
}
