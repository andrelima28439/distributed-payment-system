package com.payment.reconciliation.repository;

import com.payment.reconciliation.model.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    List<Settlement> findByStatus(String status);

    List<Settlement> findByTransactionId(String transactionId);

    List<Settlement> findBySettlementDate(LocalDate date);

    List<Settlement> findBySettlementDateBeforeAndStatus(LocalDate date, String status);
}
