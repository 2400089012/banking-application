package com.banking.controller;

import com.banking.entity.User;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getCredentials();
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam(value = "q", defaultValue = "") String query) {
        Long currentUserId = getCurrentUserId();
        List<User> users = userRepository.findByUsernameContainingAndIdNot(query, currentUserId);
        
        List<String> usernames = users.stream()
                .map(User::getUsername)
                .limit(10)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(Map.of("users", usernames));
    }
}
