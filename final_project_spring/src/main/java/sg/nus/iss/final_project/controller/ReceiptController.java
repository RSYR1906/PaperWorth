package sg.nus.iss.final_project.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.iss.final_project.model.Receipt;
import sg.nus.iss.final_project.repo.ReceiptRepository;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {
    private final ReceiptRepository receiptRepository;

    public ReceiptController(ReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    @PostMapping
    public Receipt addReceipt(@RequestBody Receipt receipt) {
        return receiptRepository.save(receipt);
    }

    @GetMapping("/{userId}")
    public List<Receipt> getUserReceipts(@PathVariable String userId) {
        return receiptRepository.findByUserId(userId);
    }
}
