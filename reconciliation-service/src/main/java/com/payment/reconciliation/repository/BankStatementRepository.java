package com.payment.reconciliation.repository;

import com.payment.reconciliation.model.BankStatement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BankStatementRepository extends JpaRepository<BankStatement, Long> {

    Optional<BankStatement> findByBankReference(String bankReference);

    List<BankStatement> findByDate(LocalDate date);

    List<BankStatement> findByStatus(String status);

    long countByDate(LocalDate date);
}
