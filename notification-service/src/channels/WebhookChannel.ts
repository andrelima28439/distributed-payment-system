import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { Logger } from '../services/Logger';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

function getCircuitBreaker(url: string): CircuitBreakerState {
  if (!circuitBreakers.has(url)) {
    circuitBreakers.set(url, { failures: 0, lastFailureTime: 0, isOpen: false });
  }
  return circuitBreakers.get(url)!;
}

function isCircuitOpen(url: string): boolean {
  const state = getCircuitBreaker(url);
  if (!state.isOpen) return false;

  const now = Date.now();
  if (now - state.lastFailureTime >= config.circuitBreaker.resetTimeoutMs) {
    state.isOpen = false;
    state.failures = 0;
    Logger.info('Circuit breaker reset', { url });
    return false;
  }

  return true;
}

function recordFailure(url: string): void {
  const state = getCircuitBreaker(url);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= config.circuitBreaker.failureThreshold) {
    state.isOpen = true;
    Logger.warn('Circuit breaker opened', {
      url,
      failures: state.failures,
      threshold: config.circuitBreaker.failureThreshold,
    });
  }
}

function recordSuccess(url: string): void {
  const state = getCircuitBreaker(url);
  state.failures = 0;
  state.isOpen = false;
}

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function attemptSend(
  url: string,
  payload: Record<string, unknown>,
  attempt: number
): Promise<boolean> {
  const payloadStr = JSON.stringify(payload);
  const signature = generateSignature(payloadStr, config.rabbitmq.url);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Event-Source': 'payflow-notification-service',
      },
      timeout: 10000,
    });

    Logger.info('Webhook sent successfully', {
      url,
      attempt,
      statusCode: response.status,
    });

    recordSuccess(url);
    return true;
  } catch (err) {
    const error = err as AxiosError;
    Logger.warn('Webhook attempt failed', {
      url,
      attempt,
      statusCode: error.response?.status,
      error: error.message,
    });

    if (attempt < config.retry.maxAttempts) {
      const delay = config.retry.baseDelayMs * Math.pow(2, attempt - 1);
      Logger.info('Retrying webhook', { url, nextAttempt: attempt + 1, delayMs: delay });
      await new Promise((resolve) => setTimeout(resolve, delay));
      return attemptSend(url, payload, attempt + 1);
    }

    recordFailure(url);
    return false;
  }
}

export async function sendWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (isCircuitOpen(url)) {
    Logger.warn('Webhook blocked by circuit breaker', { url });
    return false;
  }

  return attemptSend(url, payload, 1);
}
