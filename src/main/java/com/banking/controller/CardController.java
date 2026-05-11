package com.banking.controller;

import com.banking.entity.Card;
import com.banking.service.CardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    @Autowired
    private CardService cardService;

    @PostMapping("/issue")
    public ResponseEntity<?> issueCard(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.parseLong(request.get("userId").toString());
            String cardType = request.get("cardType").toString();
            
            Card card = cardService.issueCard(userId, cardType);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Card>> getUserCards(@PathVariable Long userId) {
        return ResponseEntity.ok(cardService.getCardsByUserId(userId));
    }

    @PutMapping("/{cardId}/block")
    public ResponseEntity<?> blockCard(@PathVariable Long cardId) {
        try {
            Card card = cardService.blockCard(cardId);
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
