package com.payment.reconciliation.service;

import com.payment.reconciliation.dto.ReconciliationDTO.DiscrepancyResponse;
import com.payment.reconciliation.dto.ReconciliationDTO.ImportResponse;
import com.payment.reconciliation.dto.ReconciliationDTO.ReconciliationReport;
import com.payment.reconciliation.model.BankStatement;
import com.payment.reconciliation.model.ReconciliationResult;
import com.payment.reconciliation.model.ReconciliationResult.ReconciliationStatus;
import com.payment.reconciliation.model.Transaction;
import com.payment.reconciliation.repository.BankStatementRepository;
import com.payment.reconciliation.repository.ReconciliationResultRepository;
import com.payment.reconciliation.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReconciliationService {

    private final TransactionRepository transactionRepository;
    private final BankStatementRepository bankStatementRepository;
    private final ReconciliationResultRepository resultRepository;
    private final BankStatementParser bankStatementParser;

    public ReconciliationService(TransactionRepository transactionRepository,
                                  BankStatementRepository bankStatementRepository,
                                  ReconciliationResultRepository resultRepository,
                                  BankStatementParser bankStatementParser) {
        this.transactionRepository = transactionRepository;
        this.bankStatementRepository = bankStatementRepository;
        this.resultRepository = resultRepository;
        this.bankStatementParser = bankStatementParser;
    }

    @Transactional
    public void reconcile() {
        List<Transaction> unreconciled = transactionRepository.findByReconciledFalse();
        List<BankStatement> statements = bankStatementRepository.findByStatus("IMPORTED");

        for (Transaction tx : unreconciled) {
            BankStatement matched = null;

            for (BankStatement stmt : statements) {
                if (bankStatementParser.fuzzyMatch(tx, stmt)) {
                    matched = stmt;
                    break;
                }
            }

            if (matched != null) {
                if (tx.getAmount().compareTo(matched.getAmount()) == 0) {
                    resultRepository.save(new ReconciliationResult(
                            tx.getTransactionId(), matched.getBankReference(),
                            ReconciliationStatus.MATCHED, BigDecimal.ZERO, "Amounts match"));
                } else {
                    BigDecimal diff = tx.getAmount().subtract(matched.getAmount()).abs();
                    resultRepository.save(new ReconciliationResult(
                            tx.getTransactionId(), matched.getBankReference(),
                            ReconciliationStatus.DISCREPANCY, diff,
                            "Amount mismatch: tx=" + tx.getAmount() + " bank=" + matched.getAmount()));
                }
                tx.setReconciled(true);
                tx.setReconciledDate(LocalDate.now());
                matched.setStatus("RECONCILED");
                transactionRepository.save(tx);
                bankStatementRepository.save(matched);
            } else {
                resultRepository.save(new ReconciliationResult(
                        tx.getTransactionId(), null,
                        ReconciliationStatus.UNMATCHED, tx.getAmount(),
                        "No matching bank statement found"));
            }
        }

        for (BankStatement stmt : statements) {
            if ("IMPORTED".equals(stmt.getStatus())) {
                resultRepository.save(new ReconciliationResult(
                        null, stmt.getBankReference(),
                        ReconciliationStatus.UNMATCHED, stmt.getAmount(),
                        "No matching transaction found"));
                stmt.setStatus("UNMATCHED");
                bankStatementRepository.save(stmt);
            }
        }
    }

    @Transactional
    public ImportResponse importBankStatement(String format, String content) {
        List<BankStatement> parsed;
        switch (format.toUpperCase()) {
            case "OFX":
                parsed = bankStatementParser.parseOFX(content);
                break;
            case "CNAB":
                parsed = bankStatementParser.parseCNAB(content);
                break;
            case "CSV":
                parsed = bankStatementParser.parseCSV(content);
                break;
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }

        List<BankStatement> saved = bankStatementRepository.saveAll(parsed);
        List<String> references = saved.stream()
                .map(BankStatement::getBankReference)
                .collect(Collectors.toList());

        return new ImportResponse(saved.size(), references);
    }

    public List<DiscrepancyResponse> getDiscrepancies() {
        List<ReconciliationResult> results = resultRepository.findByStatus(ReconciliationStatus.DISCREPANCY);
        results.addAll(resultRepository.findByStatus(ReconciliationStatus.UNMATCHED));

        return results.stream().map(r -> {
            DiscrepancyResponse dto = new DiscrepancyResponse();
            dto.setId(r.getId());
            dto.setTransactionId(r.getTransactionId());
            dto.setBankReference(r.getBankReference());
            dto.setStatus(r.getStatus());
            dto.setDifference(r.getDifference());
            dto.setNotes(r.getNotes());
            dto.setCreatedAt(r.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void approveDiscrepancy(Long id) {
        ReconciliationResult result = resultRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Discrepancy not found: " + id));

        result.setStatus(ReconciliationStatus.MATCHED);
        result.setNotes(result.getNotes() + " | Approved override at " + LocalDateTime.now());
        resultRepository.save(result);
    }

    public ReconciliationReport getReconciliationReport(LocalDate date) {
        ReconciliationReport report = new ReconciliationReport();
        report.setDate(date);

        List<Transaction> transactions = transactionRepository.findByDate(date);
        report.setTotalTransactions(transactions.size());
        report.setTotalAmount(transactions.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        long matched = resultRepository.countByStatus(ReconciliationStatus.MATCHED);
        long discrepancies = resultRepository.countByStatus(ReconciliationStatus.DISCREPANCY);
        long unmatched = resultRepository.countByStatus(ReconciliationStatus.UNMATCHED);

        report.setMatched((int) matched);
        report.setDiscrepancies((int) discrepancies);
        report.setUnmatched((int) unmatched);

        BigDecimal totalDiff = resultRepository.findAll().stream()
                .map(ReconciliationResult::getDifference)
                .filter(d -> d != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        report.setTotalDifference(totalDiff);

        return report;
    }
}
