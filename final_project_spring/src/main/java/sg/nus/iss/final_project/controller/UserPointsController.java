package sg.nus.iss.final_project.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.PointTransaction;
import sg.nus.iss.final_project.repo.PointTransactionRepository;
import sg.nus.iss.final_project.repo.UserPointsRepository;

@RestController
@RequestMapping("/api/user-points")
public class UserPointsController {

    @Autowired
    private UserPointsRepository userPointsRepository;

    @Autowired
    private PointTransactionRepository pointTransactionRepository;

    // Get user points
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserPoints(@PathVariable String userId) {
        return userPointsRepository.findByUserId(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Get all points transactions for a user
    @GetMapping("/{userId}/transactions")
    public ResponseEntity<List<PointTransaction>> getUserTransactions(@PathVariable String userId) {
        List<PointTransaction> transactions = pointTransactionRepository.findByUserId(userId);
        return ResponseEntity.ok(transactions);
    }

    // Get transactions by type (EARNED or SPENT)
    @GetMapping("/{userId}/transactions/type/{type}")
    public ResponseEntity<List<PointTransaction>> getUserTransactionsByType(
            @PathVariable String userId,
            @PathVariable String type) {
        List<PointTransaction> transactions = pointTransactionRepository.findByUserIdAndTransactionType(userId, type);
        return ResponseEntity.ok(transactions);
    }

    // Get transactions by source (e.g., RECEIPT_SCAN, REWARD_REDEMPTION)
    @GetMapping("/{userId}/transactions/source/{source}")
    public ResponseEntity<List<PointTransaction>> getUserTransactionsBySource(
            @PathVariable String userId,
            @PathVariable String source) {
        List<PointTransaction> transactions = pointTransactionRepository.findByUserIdAndSource(userId, source);
        return ResponseEntity.ok(transactions);
    }
}