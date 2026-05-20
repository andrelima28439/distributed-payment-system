package com.payment.reconciliation.job;

import com.payment.reconciliation.dto.ReconciliationDTO.ReconciliationReport;
import com.payment.reconciliation.service.ReconciliationService;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DailyReconciliationJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(DailyReconciliationJob.class);
    private final ReconciliationService reconciliationService;

    public DailyReconciliationJob(ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        try {
            executeDailyReconciliation();
        } catch (Exception e) {
            log.error("Daily reconciliation job failed", e);
            throw new JobExecutionException(e);
        }
    }

    public void executeDailyReconciliation() {
        log.info("Starting daily reconciliation...");
        reconciliationService.reconcile();
        log.info("Daily reconciliation completed.");
        generateReport();
    }

    public void generateReport() {
        ReconciliationReport report = reconciliationService.getReconciliationReport(LocalDate.now());
        log.info("Reconciliation Report: matched={}, discrepancies={}, unmatched={}",
                report.getMatched(), report.getDiscrepancies(), report.getUnmatched());
    }

    public void sendNotification() {
        ReconciliationReport report = reconciliationService.getReconciliationReport(LocalDate.now());
        if (report.getDiscrepancies() > 0 || report.getUnmatched() > 0) {
            log.warn("ALERT: {} discrepancies and {} unmatched transactions found",
                    report.getDiscrepancies(), report.getUnmatched());
        } else {
            log.info("All transactions reconciled successfully.");
        }
    }
}
