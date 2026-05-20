package com.payment.reconciliation.repository;

import com.payment.reconciliation.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByTransactionId(String transactionId);

    List<Transaction> findByDate(LocalDate date);

    List<Transaction> findByReconciledFalse();

    List<Transaction> findByMerchantId(String merchantId);

    long countByDate(LocalDate date);
}
