package sg.nus.iss.final_project.repo;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import sg.nus.iss.final_project.model.UserPoints;

public interface UserPointsRepository extends MongoRepository<UserPoints, String> {
    // Find by user ID
    Optional<UserPoints> findByUserId(String userId);

    // Find users with high points
    List<UserPoints> findByAvailablePointsGreaterThan(int threshold);

    // Find users who haven't updated their points recently
    List<UserPoints> findByLastUpdatedBefore(LocalDateTime date);
}
