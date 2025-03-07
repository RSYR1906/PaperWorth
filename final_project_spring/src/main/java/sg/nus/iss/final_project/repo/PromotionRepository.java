package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import sg.nus.iss.final_project.model.Promotion;

public interface PromotionRepository extends MongoRepository<Promotion, String> {
    List<Promotion> findByMerchant(String merchant);

}
