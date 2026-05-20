package com.payment.reconciliation.repository;

import com.payment.reconciliation.model.ReconciliationResult;
import com.payment.reconciliation.model.ReconciliationResult.ReconciliationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReconciliationResultRepository extends JpaRepository<ReconciliationResult, Long> {

    List<ReconciliationResult> findByStatus(ReconciliationStatus status);

    List<ReconciliationResult> findByTransactionId(String transactionId);

    List<ReconciliationResult> findByBankReference(String bankReference);

    long countByStatus(ReconciliationStatus status);
}
