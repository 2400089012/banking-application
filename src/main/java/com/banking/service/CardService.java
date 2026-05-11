package com.banking.service;

import com.banking.entity.Card;
import com.banking.entity.User;
import com.banking.repository.CardRepository;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

@Service
public class CardService {

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private UserRepository userRepository;

    public Card issueCard(Long userId, String cardType) throws Exception {
        User user = userRepository.findById(userId).orElseThrow(() -> new Exception("User not found"));
        
        Card card = new Card();
        card.setUserId(user.getId());
        card.setCardType(cardType);
        
        Random rnd = new Random();
        long first14 = (long) (rnd.nextDouble() * 100000000000000L);
        card.setCardNumber("4000" + String.format("%012d", first14));
        
        LocalDate expiry = LocalDate.now().plusYears(3);
        card.setExpiryDate(expiry.format(DateTimeFormatter.ofPattern("MM/yy")));
        
        int cvv = 100 + rnd.nextInt(900);
        card.setCvv(String.valueOf(cvv));
        
        if ("Credit".equalsIgnoreCase(cardType)) {
            card.setCreditLimit(50000.0); 
        }
        
        return cardRepository.save(card);
    }

    public List<Card> getCardsByUserId(Long userId) {
        return cardRepository.findByUserId(userId);
    }

    public Card blockCard(Long cardId) throws Exception {
        Card card = cardRepository.findById(cardId).orElseThrow(() -> new Exception("Card not found"));
        card.setStatus("BLOCKED");
        return cardRepository.save(card);
    }
}
