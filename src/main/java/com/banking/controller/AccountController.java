package com.banking.controller;

import com.banking.dto.SettingsRequest;
import com.banking.dto.TransactionRequest;
import com.banking.entity.Notification;
import com.banking.entity.SuspiciousActivity;
import com.banking.entity.Transaction;
import com.banking.entity.User;
import com.banking.repository.NotificationRepository;
import com.banking.repository.SuspiciousActivityRepository;
import com.banking.repository.TransactionRepository;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SuspiciousActivityRepository suspiciousActivityRepository;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getCredentials();
    }
    
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }

    private void logNotification(Long userId, String message, String type) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setMessage(message);
        notification.setType(type);
        notification.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    private void logSuspicious(Long userId, String type, String description) {
        SuspiciousActivity activity = new SuspiciousActivity();
        activity.setUserId(userId);
        activity.setActivityType(type);
        activity.setDescription(description);
        activity.setCreatedAt(LocalDateTime.now());
        suspiciousActivityRepository.save(activity);
    }

    @GetMapping("/balance")
    public ResponseEntity<?> getBalance() {
        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();
        return ResponseEntity.ok(Map.of("balance", user.getBalance()));
    }

    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(@RequestBody TransactionRequest request) {
        if (request.getAmount() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount"));
        }

        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        user.setBalance(user.getBalance() + request.getAmount());
        userRepository.save(user);

        String txnId = "TXN" + System.currentTimeMillis() + (int)(Math.random() * 1000);
        
        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setType("DEPOSIT");
        tx.setAmount(request.getAmount());
        tx.setCategory(request.getCategory() != null ? request.getCategory() : "Salary");
        tx.setDescription("Deposit to account");
        tx.setTransactionId(txnId);
        tx.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(tx);

        if (request.getAmount() > 50000) {
            logSuspicious(userId, "LARGE_DEPOSIT", "User deposited ₹" + request.getAmount());
        }
        logNotification(userId, "₹" + request.getAmount() + " deposited to your account. Ref: " + txnId, "transaction");

        return ResponseEntity.ok(Map.of("message", "Deposit successful", "transaction_id", txnId));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(@RequestBody TransactionRequest request) {
        if (request.getAmount() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount"));
        }

        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        if (user.getBalance() < request.getAmount()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
        }

        // Budget check
        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        Double currentSpent = transactionRepository.sumSpentSince(userId, startOfMonth);
        if (currentSpent == null) currentSpent = 0.0;

        if (user.getMonthlyLimit() != null && user.getMonthlyLimit() > 0 && (currentSpent + request.getAmount()) > user.getMonthlyLimit()) {
            logNotification(userId, "Warning: You have exceeded your monthly budget of ₹" + user.getMonthlyLimit() + "!", "warning");
        }

        user.setBalance(user.getBalance() - request.getAmount());
        userRepository.save(user);

        String txnId = "TXN" + System.currentTimeMillis() + (int)(Math.random() * 1000);
        
        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setType("WITHDRAW");
        tx.setAmount(request.getAmount());
        tx.setCategory(request.getCategory() != null ? request.getCategory() : "General");
        tx.setDescription("Withdrawal from account");
        tx.setTransactionId(txnId);
        tx.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(tx);

        if (request.getAmount() > 50000) {
            logSuspicious(userId, "LARGE_WITHDRAWAL", "User withdrew ₹" + request.getAmount());
        }
        logNotification(userId, "₹" + request.getAmount() + " withdrawn from your account. Ref: " + txnId, "transaction");

        return ResponseEntity.ok(Map.of("message", "Withdrawal successful", "transaction_id", txnId));
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(@RequestBody TransactionRequest request) {
        if (request.getAmount() == null || request.getAmount() <= 0 || request.getToUsername() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid parameters"));
        }

        Long userId = getCurrentUserId();
        String currentUsername = getCurrentUsername();
        
        if (request.getToUsername().equals(currentUsername)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot transfer to yourself"));
        }

        Optional<User> toUserOpt = userRepository.findByUsername(request.getToUsername());
        if (toUserOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Recipient not found"));
        }
        User toUser = toUserOpt.get();
        User fromUser = userRepository.findById(userId).orElseThrow();

        if (fromUser.getBalance() < request.getAmount()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
        }

        // Budget check
        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        Double currentSpent = transactionRepository.sumSpentSince(userId, startOfMonth);
        if (currentSpent == null) currentSpent = 0.0;

        if (fromUser.getMonthlyLimit() != null && fromUser.getMonthlyLimit() > 0 && (currentSpent + request.getAmount()) > fromUser.getMonthlyLimit()) {
            logNotification(userId, "Warning: You have exceeded your monthly budget of ₹" + fromUser.getMonthlyLimit() + "!", "warning");
        }

        fromUser.setBalance(fromUser.getBalance() - request.getAmount());
        toUser.setBalance(toUser.getBalance() + request.getAmount());
        
        userRepository.save(fromUser);
        userRepository.save(toUser);

        String txnId = "TXN" + System.currentTimeMillis() + (int)(Math.random() * 1000);
        
        // Sender Transaction
        Transaction txOut = new Transaction();
        txOut.setUserId(userId);
        txOut.setType("TRANSFER_OUT");
        txOut.setAmount(request.getAmount());
        txOut.setCategory(request.getCategory() != null ? request.getCategory() : "Transfer");
        txOut.setDescription("Transfer to " + request.getToUsername());
        txOut.setRelatedUserId(toUser.getId());
        txOut.setTransactionId(txnId);
        txOut.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(txOut);

        // Receiver Transaction
        Transaction txIn = new Transaction();
        txIn.setUserId(toUser.getId());
        txIn.setType("TRANSFER_IN");
        txIn.setAmount(request.getAmount());
        txIn.setCategory(request.getCategory() != null ? request.getCategory() : "Transfer");
        txIn.setDescription("Transfer from " + currentUsername);
        txIn.setRelatedUserId(userId);
        txIn.setTransactionId(txnId);
        txIn.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(txIn);

        if (request.getAmount() > 50000) {
            logSuspicious(userId, "LARGE_TRANSFER", "User transferred ₹" + request.getAmount() + " to " + request.getToUsername());
        }
        logNotification(userId, "₹" + request.getAmount() + " transferred to " + request.getToUsername() + ". Ref: " + txnId, "transaction");
        logNotification(toUser.getId(), "You received ₹" + request.getAmount() + " from " + currentUsername + ". Ref: " + txnId, "transaction");

        return ResponseEntity.ok(Map.of("message", "Transfer successful", "transaction_id", txnId));
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions() {
        Long userId = getCurrentUserId();
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(Map.of("transactions", transactions));
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications() {
        Long userId = getCurrentUserId();
        List<Notification> notifications = notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(Map.of("notifications", notifications));
    }

    @PostMapping("/budget")
    public ResponseEntity<?> updateBudget(@RequestBody SettingsRequest request) {
        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();
        user.setMonthlyLimit(request.getLimit());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Monthly limit updated"));
    }

    @PutMapping("/theme")
    public ResponseEntity<?> updateTheme(@RequestBody SettingsRequest request) {
        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();
        user.setTheme(request.getTheme());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Theme updated"));
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics() {
        Long userId = getCurrentUserId();
        LocalDateTime startOfMonth = LocalDateTime.now().minusDays(30);
        
        List<Object[]> categoryData = transactionRepository.getCategoryWiseSpending(userId, startOfMonth);
        List<Map<String, Object>> categories = new ArrayList<>();
        for (Object[] row : categoryData) {
            categories.add(Map.of("category", row[0], "total", row[1]));
        }

        List<Object[]> monthlyData = transactionRepository.getMonthlySpending(userId);
        List<Map<String, Object>> months = new ArrayList<>();
        for (Object[] row : monthlyData) {
            months.add(Map.of("month", row[0], "total", row[1]));
        }
        Collections.reverse(months);

        return ResponseEntity.ok(Map.of("categories", categories, "months", months));
    }
}
