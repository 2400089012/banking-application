package com.banking.controller;

import com.banking.entity.SuspiciousActivity;
import com.banking.entity.Transaction;
import com.banking.entity.User;
import com.banking.repository.SuspiciousActivityRepository;
import com.banking.repository.TransactionRepository;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private SuspiciousActivityRepository suspiciousActivityRepository;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(Map.of("users", users));
    }

    @PutMapping("/users/{id}/block")
    public ResponseEntity<?> toggleBlockUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        if ("PENDING".equals(user.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot block a pending user"));
        }
        
        String newStatus = "BLOCKED".equals(user.getStatus()) ? "ACTIVE" : "BLOCKED";
        user.setStatus(newStatus);
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "User status changed to " + newStatus, "status", newStatus));
    }

    @PutMapping("/users/{id}/approve")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        if (!"PENDING".equals(user.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "User is not in pending state"));
        }
        
        user.setStatus("ACTIVE");
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "User approved successfully", "status", "ACTIVE"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        user.setStatus("DELETED");
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    @GetMapping("/users/{id}/transactions")
    public ResponseEntity<?> getUserTransactions(@PathVariable Long id) {
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(id);
        return ResponseEntity.ok(Map.of("transactions", transactions));
    }

    @GetMapping("/suspicious")
    public ResponseEntity<?> getSuspiciousActivity() {
        List<SuspiciousActivity> activities = suspiciousActivityRepository.findAll();
        // The original Node backend joined with users to get username. 
        // A simple way here is to return activities, but we need usernames.
        // For simplicity, we can fetch all users and map them.
        List<User> users = userRepository.findAll();
        Map<Long, String> userMap = users.stream().collect(java.util.stream.Collectors.toMap(User::getId, User::getUsername));
        
        List<Map<String, Object>> result = activities.stream().map(a -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", a.getId());
            map.put("user_id", a.getUserId());
            map.put("username", userMap.getOrDefault(a.getUserId(), "Unknown"));
            map.put("activity_type", a.getActivityType());
            map.put("description", a.getDescription());
            map.put("created_at", a.getCreatedAt());
            return map;
        }).collect(java.util.stream.Collectors.toList());
        
        // sort by created_at desc
        result.sort((m1, m2) -> ((java.time.LocalDateTime)m2.get("created_at")).compareTo((java.time.LocalDateTime)m1.get("created_at")));
        
        return ResponseEntity.ok(Map.of("activities", result));
    }
}
