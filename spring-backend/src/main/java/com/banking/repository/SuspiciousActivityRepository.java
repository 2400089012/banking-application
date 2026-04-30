package com.banking.repository;

import com.banking.entity.SuspiciousActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SuspiciousActivityRepository extends JpaRepository<SuspiciousActivity, Long> {
    
    @Query("SELECT s, u.username FROM SuspiciousActivity s JOIN User u ON s.userId = u.id ORDER BY s.createdAt DESC")
    List<Object[]> findAllWithUsername();
}
