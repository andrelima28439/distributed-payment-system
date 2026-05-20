package com.payment.reconciliation.service;

import com.payment.reconciliation.dto.ReconciliationDTO.SettlementResponse;
import com.payment.reconciliation.dto.ReconciliationDTO.SplitDetail;
import com.payment.reconciliation.model.Settlement;
import com.payment.reconciliation.repository.SettlementRepository;
import com.payment.reconciliation.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final TransactionRepository transactionRepository;

    public SettlementService(SettlementRepository settlementRepository,
                              TransactionRepository transactionRepository) {
        this.settlementRepository = settlementRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public Settlement calculateSettlement(String transactionId, BigDecimal mdrRate) {
        var transaction = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

        BigDecimal grossAmount = transaction.getAmount();
        BigDecimal fee = grossAmount.multiply(mdrRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal netAmount = grossAmount.subtract(fee);

        Settlement settlement = new Settlement(
                transactionId, grossAmount, fee, netAmount,
                LocalDate.now().plusDays(2), "PENDING"
        );

        return settlementRepository.save(settlement);
    }

    @Transactional
    public List<Settlement> processBatchSettlement() {
        List<Settlement> pending = settlementRepository.findByStatus("PENDING");
        List<Settlement> processed = new ArrayList<>();

        for (Settlement settlement : pending) {
            if (!settlement.getSettlementDate().isAfter(LocalDate.now())) {
                settlement.setStatus("SETTLED");
                processed.add(settlementRepository.save(settlement));
            }
        }
        return processed;
    }

    public List<SettlementResponse> getSettlementSchedule() {
        List<Settlement> pending = settlementRepository.findByStatus("PENDING");
        return pending.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public List<Settlement> processSplitPayment(String transactionId, List<SplitDetail> splits) {
        var transaction = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

        BigDecimal totalAllocated = splits.stream()
                .map(SplitDetail::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAllocated.compareTo(transaction.getAmount()) > 0) {
            throw new IllegalArgumentException("Split amounts exceed transaction amount");
        }

        List<Settlement> settlements = new ArrayList<>();
        for (SplitDetail split : splits) {
            BigDecimal fee = split.getAmount().multiply(new BigDecimal("2.5"))
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal netAmount = split.getAmount().subtract(fee);

            Settlement settlement = new Settlement(
                    transactionId + "-" + split.getRecipientId(),
                    split.getAmount(), fee, netAmount,
                    LocalDate.now().plusDays(2), "PENDING"
            );
            settlements.add(settlementRepository.save(settlement));
        }
        return settlements;
    }

    public List<SettlementResponse> getAllSettlements() {
        return settlementRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private SettlementResponse toResponse(Settlement s) {
        SettlementResponse r = new SettlementResponse();
        r.setId(s.getId());
        r.setTransactionId(s.getTransactionId());
        r.setGrossAmount(s.getGrossAmount());
        r.setFee(s.getFee());
        r.setNetAmount(s.getNetAmount());
        r.setSettlementDate(s.getSettlementDate());
        r.setStatus(s.getStatus());
        return r;
    }
}
