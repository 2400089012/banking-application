package com.banking.service;

import com.banking.entity.User;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Random;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User register(String username, String password) throws Exception {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new Exception("Username already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));

        String role = username.equalsIgnoreCase("admin") ? "admin" : "user";
        user.setRole(role);
        user.setStatus(role.equals("admin") ? "ACTIVE" : "PENDING");
        user.setAccountNo(generateAccountNo());

        return userRepository.save(user);
    }

    private String generateAccountNo() {
        Random rnd = new Random();
        long n = 1000000000L + (long) (rnd.nextDouble() * 9000000000L);
        return String.valueOf(n);
    }
}
