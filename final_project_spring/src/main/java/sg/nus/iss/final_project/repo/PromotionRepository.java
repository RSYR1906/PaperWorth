package sg.nus.iss.final_project.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import sg.nus.iss.final_project.model.Promotion;

public interface PromotionRepository extends MongoRepository<Promotion, String> {
    // Find promotions by exact merchant name
    List<Promotion> findByMerchant(String merchant);

    // Find promotions by merchant name (case-insensitive, partial match)
    List<Promotion> findByMerchantContainingIgnoreCase(String merchant);

    // Find promotions by category
    List<Promotion> findByCategory(String category);

    // Find promotions by merchant name or description containing text
    // (case-insensitive)
    @Query("{ $or: [ { 'merchant': { $regex: ?0, $options: 'i' } }, { 'description': { $regex: ?0, $options: 'i' } } ] }")
    List<Promotion> findByMerchantOrDescriptionContaining(String text);

    // Find promotions that expire after a certain date
    List<Promotion> findByExpiryGreaterThan(String date);

    // Find promotions by category ordered by expiry date
    List<Promotion> findByCategoryOrderByExpiry(String category);

    // Find promotions by promotion ID
    Promotion findByPromotionId(int promotionId);
}