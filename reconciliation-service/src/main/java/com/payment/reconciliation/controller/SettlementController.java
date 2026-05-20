package com.payment.reconciliation.controller;

import com.payment.reconciliation.dto.ReconciliationDTO.SettlementResponse;
import com.payment.reconciliation.dto.ReconciliationDTO.SplitPaymentRequest;
import com.payment.reconciliation.model.Settlement;
import com.payment.reconciliation.service.SettlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/settlements")
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @GetMapping
    public ResponseEntity<List<SettlementResponse>> getSettlements() {
        List<SettlementResponse> settlements = settlementService.getAllSettlements();
        return ResponseEntity.ok(settlements);
    }

    @GetMapping("/schedule")
    public ResponseEntity<List<SettlementResponse>> getSchedule() {
        List<SettlementResponse> schedule = settlementService.getSettlementSchedule();
        return ResponseEntity.ok(schedule);
    }

    @PostMapping("/process")
    public ResponseEntity<String> processBatch() {
        List<Settlement> processed = settlementService.processBatchSettlement();
        return ResponseEntity.ok("Processed " + processed.size() + " settlements");
    }

    @PostMapping("/calculate")
    public ResponseEntity<SettlementResponse> calculateSettlement(
            @RequestParam String transactionId,
            @RequestParam BigDecimal mdrRate) {
        Settlement settlement = settlementService.calculateSettlement(transactionId, mdrRate);
        SettlementResponse response = toResponse(settlement);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/split")
    public ResponseEntity<List<SettlementResponse>> splitPayment(@RequestBody SplitPaymentRequest request) {
        List<Settlement> settlements = settlementService.processSplitPayment(
                request.getTransactionId(), request.getSplits());
        List<SettlementResponse> responses = settlements.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
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
