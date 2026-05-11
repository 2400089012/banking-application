package com.banking.service;

import com.banking.entity.Loan;
import com.banking.entity.User;
import com.banking.repository.LoanRepository;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LoanService {

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private UserRepository userRepository;

    public Loan applyForLoan(Long userId, String loanType, Double amount, Integer durationMonths) throws Exception {
        User user = userRepository.findById(userId).orElseThrow(() -> new Exception("User not found"));
        
        Loan loan = new Loan();
        loan.setUserId(user.getId());
        loan.setLoanType(loanType);
        loan.setAmount(amount);
        loan.setDurationMonths(durationMonths);
        
        if ("Home".equalsIgnoreCase(loanType)) loan.setInterestRate(7.5);
        else if ("Auto".equalsIgnoreCase(loanType)) loan.setInterestRate(8.5);
        else loan.setInterestRate(12.0); 
        
        return loanRepository.save(loan);
    }

    public List<Loan> getLoansByUserId(Long userId) {
        return loanRepository.findByUserId(userId);
    }
    
    public List<Loan> getAllPendingLoans() {
        return loanRepository.findByStatus("PENDING");
    }

    public Loan approveLoan(Long loanId) throws Exception {
        Loan loan = loanRepository.findById(loanId).orElseThrow(() -> new Exception("Loan not found"));
        loan.setStatus("APPROVED");
        
        // Disburse loan amount to user's balance
        User user = userRepository.findById(loan.getUserId()).orElseThrow(() -> new Exception("User not found"));
        user.setBalance(user.getBalance() + loan.getAmount());
        userRepository.save(user);
        
        return loanRepository.save(loan);
    }

    public Loan rejectLoan(Long loanId) throws Exception {
        Loan loan = loanRepository.findById(loanId).orElseThrow(() -> new Exception("Loan not found"));
        loan.setStatus("REJECTED");
        return loanRepository.save(loan);
    }
}
