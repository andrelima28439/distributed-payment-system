package com.payment.reconciliation.service;

import com.payment.reconciliation.model.BankStatement;
import com.payment.reconciliation.model.Transaction;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class BankStatementParser {

    private static final double FUZZY_MATCH_THRESHOLD = 0.8;

    public List<BankStatement> parseOFX(String content) {
        List<BankStatement> statements = new ArrayList<>();
        String[] lines = content.split("\\n");
        String reference = null;
        BigDecimal amount = null;
        LocalDate date = null;
        String description = null;

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("<FITID>")) {
                reference = trimmed.replace("<FITID>", "").replace("</FITID>", "").trim();
            } else if (trimmed.startsWith("<TRNAMT>")) {
                amount = new BigDecimal(trimmed.replace("<TRNAMT>", "").replace("</TRNAMT>", "").trim());
            } else if (trimmed.startsWith("<DTPOSTED>")) {
                String dateStr = trimmed.replace("<DTPOSTED>", "").replace("</DTPOSTED>", "").trim();
                date = LocalDate.parse(dateStr.substring(0, 8), DateTimeFormatter.ofPattern("yyyyMMdd"));
            } else if (trimmed.startsWith("<MEMO>")) {
                description = trimmed.replace("<MEMO>", "").replace("</MEMO>", "").trim();
            }

            if (reference != null && amount != null && date != null) {
                statements.add(new BankStatement(reference, amount, date, description, "IMPORTED"));
                reference = null;
                amount = null;
                date = null;
                description = null;
            }
        }
        return statements;
    }

    public List<BankStatement> parseCNAB(String content) {
        List<BankStatement> statements = new ArrayList<>();
        String[] lines = content.split("\\n");

        for (String line : lines) {
            if (line.length() < 240) continue;

            String recordType = line.substring(0, 1);
            if ("1".equals(recordType)) {
                String reference = line.substring(10, 30).trim();
                String amountStr = line.substring(120, 135).trim();
                String dateStr = line.substring(100, 108).trim();
                BigDecimal amount = new BigDecimal(amountStr).divide(new BigDecimal(100));
                LocalDate date = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd"));
                String description = line.substring(150, 200).trim();

                statements.add(new BankStatement(reference, amount, date, description, "IMPORTED"));
            }
        }
        return statements;
    }

    public List<BankStatement> parseCSV(String content) {
        List<BankStatement> statements = new ArrayList<>();
        String[] lines = content.split("\\n");

        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            String[] fields = line.split(",");
            if (fields.length >= 4) {
                String reference = fields[0].trim();
                BigDecimal amount = new BigDecimal(fields[1].trim());
                LocalDate date = LocalDate.parse(fields[2].trim(), DateTimeFormatter.ISO_LOCAL_DATE);
                String description = fields[3].trim();

                statements.add(new BankStatement(reference, amount, date, description, "IMPORTED"));
            }
        }
        return statements;
    }

    public boolean fuzzyMatch(Transaction transaction, BankStatement bankEntry) {
        if (transaction.getAmount().compareTo(bankEntry.getAmount()) == 0
                && transaction.getDate().equals(bankEntry.getDate())) {
            return true;
        }

        double amountSimilarity = similarity(
                transaction.getAmount().toString(),
                bankEntry.getAmount().toString()
        );

        String txDesc = transaction.getTransactionId() + transaction.getMerchantId();
        String bankDesc = bankEntry.getBankReference() + bankEntry.getDescription();
        double descSimilarity = similarity(txDesc.toLowerCase(), bankDesc.toLowerCase());

        return (amountSimilarity + descSimilarity) / 2.0 >= FUZZY_MATCH_THRESHOLD;
    }

    private double similarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        int maxLen = Math.max(s1.length(), s2.length());
        if (maxLen == 0) return 1.0;

        int distance = levenshteinDistance(s1, s2);
        return 1.0 - ((double) distance / maxLen);
    }

    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= s2.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost);
            }
        }
        return dp[s1.length()][s2.length()];
    }
}
