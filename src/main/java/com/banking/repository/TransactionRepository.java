package com.banking.repository;

import com.banking.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.userId = :userId AND (t.type = 'WITHDRAW' OR t.type = 'TRANSFER_OUT') AND t.createdAt >= :startDate")
    Double sumSpentSince(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT t.category, SUM(t.amount) as total FROM Transaction t WHERE t.userId = :userId AND (t.type = 'WITHDRAW' OR t.type = 'TRANSFER_OUT') AND t.createdAt > :startDate GROUP BY t.category")
    List<Object[]> getCategoryWiseSpending(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);

    @Query(value = "SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total FROM transactions WHERE user_id = :userId AND (type = 'WITHDRAW' OR type = 'TRANSFER_OUT') GROUP BY month ORDER BY month DESC LIMIT 6", nativeQuery = true)
    List<Object[]> getMonthlySpending(@Param("userId") Long userId);
}
