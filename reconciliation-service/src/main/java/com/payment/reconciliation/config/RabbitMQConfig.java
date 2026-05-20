package com.payment.reconciliation.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String RECONCILIATION_QUEUE = "reconciliation.queue";
    public static final String SETTLEMENT_QUEUE = "settlement.queue";
    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String EXCHANGE = "payment.exchange";

    @Bean
    public Queue reconciliationQueue() {
        return new Queue(RECONCILIATION_QUEUE, true);
    }

    @Bean
    public Queue settlementQueue() {
        return new Queue(SETTLEMENT_QUEUE, true);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public TopicExchange paymentExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Binding reconciliationBinding(Queue reconciliationQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(reconciliationQueue).to(paymentExchange).with("reconciliation.*");
    }

    @Bean
    public Binding settlementBinding(Queue settlementQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(settlementQueue).to(paymentExchange).with("settlement.*");
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange paymentExchange) {
        return BindingBuilder.bind(notificationQueue).to(paymentExchange).with("notification.*");
    }
}
