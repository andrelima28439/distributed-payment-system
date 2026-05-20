package com.payment.reconciliation.controller;

import com.payment.reconciliation.dto.ReconciliationDTO.DiscrepancyResponse;
import com.payment.reconciliation.dto.ReconciliationDTO.ImportRequest;
import com.payment.reconciliation.dto.ReconciliationDTO.ImportResponse;
import com.payment.reconciliation.dto.ReconciliationDTO.ReconciliationReport;
import com.payment.reconciliation.service.ReconciliationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reconciliation")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    public ReconciliationController(ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @PostMapping("/import")
    public ResponseEntity<ImportResponse> importBankStatement(@RequestBody ImportRequest request) {
        ImportResponse response = reconciliationService.importBankStatement(
                request.getFormat(), request.getContent());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        reconciliationService.reconcile();
        return ResponseEntity.ok("Reconciliation completed successfully");
    }

    @GetMapping("/discrepancies")
    public ResponseEntity<List<DiscrepancyResponse>> getDiscrepancies() {
        List<DiscrepancyResponse> discrepancies = reconciliationService.getDiscrepancies();
        return ResponseEntity.ok(discrepancies);
    }

    @PostMapping("/discrepancies/{id}/approve")
    public ResponseEntity<String> approveDiscrepancy(@PathVariable Long id) {
        reconciliationService.approveDiscrepancy(id);
        return ResponseEntity.ok("Discrepancy " + id + " approved successfully");
    }

    @GetMapping("/report")
    public ResponseEntity<ReconciliationReport> getReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        ReconciliationReport report = reconciliationService.getReconciliationReport(date);
        return ResponseEntity.ok(report);
    }
}
