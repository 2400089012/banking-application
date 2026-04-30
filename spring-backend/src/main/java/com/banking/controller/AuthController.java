package com.banking.controller;

import com.banking.config.JwtUtil;
import com.banking.dto.AuthRequest;
import com.banking.dto.RegisterRequest;
import com.banking.entity.User;
import com.banking.repository.UserRepository;
import com.banking.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User user = authService.register(request.getUsername(), request.getPassword());
            Map<String, String> response = new HashMap<>();
            response.put("message", "User created successfully");
            response.put("account_no", user.getAccountNo());
            response.put("status", user.getStatus());
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return new ResponseEntity<>(err, HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        Optional<User> optionalUser = userRepository.findByUsername(request.getUsername());
        
        if (optionalUser.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid credentials"));
        }
        
        User user = optionalUser.get();
        
        if ("PENDING".equals(user.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("error", "Your account is pending admin approval."));
        }
        if ("BLOCKED".equals(user.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("error", "Your account has been blocked by admin"));
        }
        if ("DELETED".equals(user.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("error", "Your account has been deleted by admin"));
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid credentials"));
        }

        // Simulating Captcha Check
        if (request.getCaptchaToken() != null && request.getCaptchaAnswer() != null) {
            try {
                Integer answer = jwtUtil.extractClaim(request.getCaptchaToken(), claims -> claims.get("answer", Integer.class));
                if (!request.getCaptchaAnswer().equals(answer)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Incorrect CAPTCHA answer"));
                }
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid or missing CAPTCHA"));
            }
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getId(), user.getRole());
        
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        Map<String, Object> userDto = new HashMap<>();
        userDto.put("id", user.getId());
        userDto.put("username", user.getUsername());
        userDto.put("balance", user.getBalance());
        userDto.put("role", user.getRole());
        userDto.put("theme", user.getTheme());
        userDto.put("monthly_limit", user.getMonthlyLimit());
        userDto.put("account_no", user.getAccountNo());
        response.put("user", userDto);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/captcha")
    public ResponseEntity<?> getCaptcha() {
        int num1 = (int)(Math.random() * 10) + 1;
        int num2 = (int)(Math.random() * 10) + 1;
        int answer = num1 + num2;
        String question = num1 + " + " + num2 + " = ?";
        String token = jwtUtil.generateCaptchaToken(answer);
        
        Map<String, String> response = new HashMap<>();
        response.put("question", question);
        response.put("token", token);
        return ResponseEntity.ok(response);
    }
}
