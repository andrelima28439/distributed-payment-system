package com.payment.reconciliation.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bank_statements")
public class BankStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_reference", unique = true, nullable = false)
    private String bankReference;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 500)
    private String description;

    @Column(name = "imported_date", nullable = false)
    private LocalDateTime importedDate;

    @Column(nullable = false)
    private String status;

    public BankStatement() {}

    public BankStatement(String bankReference, BigDecimal amount, LocalDate date, String description, String status) {
        this.bankReference = bankReference;
        this.amount = amount;
        this.date = date;
        this.description = description;
        this.importedDate = LocalDateTime.now();
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBankReference() { return bankReference; }
    public void setBankReference(String bankReference) { this.bankReference = bankReference; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getImportedDate() { return importedDate; }
    public void setImportedDate(LocalDateTime importedDate) { this.importedDate = importedDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
