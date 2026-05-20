package com.payment.reconciliation.dto;

import com.payment.reconciliation.model.ReconciliationResult.ReconciliationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ReconciliationDTO {

    public static class ImportRequest {
        private String format;
        private String content;
        private String fileName;

        public String getFormat() { return format; }
        public void setFormat(String format) { this.format = format; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
    }

    public static class ImportResponse {
        private int importedCount;
        private List<String> references;

        public ImportResponse(int importedCount, List<String> references) {
            this.importedCount = importedCount;
            this.references = references;
        }

        public int getImportedCount() { return importedCount; }
        public void setImportedCount(int importedCount) { this.importedCount = importedCount; }
        public List<String> getReferences() { return references; }
        public void setReferences(List<String> references) { this.references = references; }
    }

    public static class DiscrepancyResponse {
        private Long id;
        private String transactionId;
        private String bankReference;
        private ReconciliationStatus status;
        private BigDecimal difference;
        private String notes;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public String getBankReference() { return bankReference; }
        public void setBankReference(String bankReference) { this.bankReference = bankReference; }
        public ReconciliationStatus getStatus() { return status; }
        public void setStatus(ReconciliationStatus status) { this.status = status; }
        public BigDecimal getDifference() { return difference; }
        public void setDifference(BigDecimal difference) { this.difference = difference; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    public static class ReconciliationReport {
        private LocalDate date;
        private int totalTransactions;
        private int matched;
        private int discrepancies;
        private int unmatched;
        private BigDecimal totalAmount;
        private BigDecimal totalDifference;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }
        public int getTotalTransactions() { return totalTransactions; }
        public void setTotalTransactions(int totalTransactions) { this.totalTransactions = totalTransactions; }
        public int getMatched() { return matched; }
        public void setMatched(int matched) { this.matched = matched; }
        public int getDiscrepancies() { return discrepancies; }
        public void setDiscrepancies(int discrepancies) { this.discrepancies = discrepancies; }
        public int getUnmatched() { return unmatched; }
        public void setUnmatched(int unmatched) { this.unmatched = unmatched; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
        public BigDecimal getTotalDifference() { return totalDifference; }
        public void setTotalDifference(BigDecimal totalDifference) { this.totalDifference = totalDifference; }
    }

    public static class SplitPaymentRequest {
        private String transactionId;
        private List<SplitDetail> splits;

        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public List<SplitDetail> getSplits() { return splits; }
        public void setSplits(List<SplitDetail> splits) { this.splits = splits; }
    }

    public static class SplitDetail {
        private String recipientId;
        private BigDecimal amount;
        private BigDecimal percentage;

        public String getRecipientId() { return recipientId; }
        public void setRecipientId(String recipientId) { this.recipientId = recipientId; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public BigDecimal getPercentage() { return percentage; }
        public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }
    }

    public static class SettlementResponse {
        private Long id;
        private String transactionId;
        private BigDecimal grossAmount;
        private BigDecimal fee;
        private BigDecimal netAmount;
        private LocalDate settlementDate;
        private String status;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public BigDecimal getGrossAmount() { return grossAmount; }
        public void setGrossAmount(BigDecimal grossAmount) { this.grossAmount = grossAmount; }
        public BigDecimal getFee() { return fee; }
        public void setFee(BigDecimal fee) { this.fee = fee; }
        public BigDecimal getNetAmount() { return netAmount; }
        public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }
        public LocalDate getSettlementDate() { return settlementDate; }
        public void setSettlementDate(LocalDate settlementDate) { this.settlementDate = settlementDate; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
