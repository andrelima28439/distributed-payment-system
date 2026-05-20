package com.payment.reconciliation.config;

import com.payment.reconciliation.job.DailyReconciliationJob;
import com.payment.reconciliation.job.WeeklyReportJob;
import org.quartz.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class QuartzConfig {

    @Bean
    public JobDetail dailyReconciliationJobDetail() {
        return JobBuilder.newJob(DailyReconciliationJob.class)
                .withIdentity("dailyReconciliationJob")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger dailyReconciliationTrigger(JobDetail dailyReconciliationJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(dailyReconciliationJobDetail)
                .withIdentity("dailyReconciliationTrigger")
                .withSchedule(CronScheduleBuilder.dailyAtHourAndMinute(0, 0))
                .build();
    }

    @Bean
    public JobDetail weeklyReportJobDetail() {
        return JobBuilder.newJob(WeeklyReportJob.class)
                .withIdentity("weeklyReportJob")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger weeklyReportTrigger(JobDetail weeklyReportJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(weeklyReportJobDetail)
                .withIdentity("weeklyReportTrigger")
                .withSchedule(CronScheduleBuilder.weeklyOnDayAndHourAndMinute(DateBuilder.SUNDAY, 23, 59))
                .build();
    }
}
