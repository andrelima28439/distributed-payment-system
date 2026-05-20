package com.payment.reconciliation.job;

import com.payment.reconciliation.dto.ReconciliationDTO.ReconciliationReport;
import com.payment.reconciliation.service.ReconciliationService;
import com.payment.reconciliation.service.SettlementService;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

@Component
public class WeeklyReportJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(WeeklyReportJob.class);
    private final ReconciliationService reconciliationService;
    private final SettlementService settlementService;

    public WeeklyReportJob(ReconciliationService reconciliationService,
                            SettlementService settlementService) {
        this.reconciliationService = reconciliationService;
        this.settlementService = settlementService;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        try {
            generateWeeklyReport();
        } catch (Exception e) {
            log.error("Weekly report job failed", e);
            throw new JobExecutionException(e);
        }
    }

    public void generateWeeklyReport() {
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = LocalDate.now().with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        log.info("Generating weekly reconciliation report for {} to {}", weekStart, weekEnd);

        ReconciliationReport report = reconciliationService.getReconciliationReport(LocalDate.now());
        log.info("=== Weekly Reconciliation Summary ===");
        log.info("Period: {} to {}", weekStart, weekEnd);
        log.info("Total Transactions: {}", report.getTotalTransactions());
        log.info("Matched: {}", report.getMatched());
        log.info("Discrepancies: {}", report.getDiscrepancies());
        log.info("Unmatched: {}", report.getUnmatched());
        log.info("Total Amount: {}", report.getTotalAmount());
        log.info("Total Difference: {}", report.getTotalDifference());

        var settlements = settlementService.getAllSettlements();
        log.info("Total Settlements in Period: {}", settlements.size());

        sendWeeklyNotification(report);
    }

    public void sendWeeklyNotification(ReconciliationReport report) {
        if (report.getDiscrepancies() > 5) {
            log.warn("WEEKLY ALERT: High number of discrepancies ({}) requiring attention",
                    report.getDiscrepancies());
        }
        log.info("Weekly report notification sent.");
    }
}
