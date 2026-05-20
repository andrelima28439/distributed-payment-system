import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://payment-gateway:3001';
const API_KEY = 'pk_test_abcdef123456';

const createTransactionFailureRate = new Rate('create_transaction_failures');
const transactionDuration = new Trend('transaction_duration');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    amount: Math.floor(Math.random() * 10000) + 100,
    currency: 'USD',
    description: `k6 test transaction ${Date.now()}`,
    cardNumber: '4111111111111111',
    cardExpiry: '12/28',
    cardCvv: '123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    timeout: '10s',
  };

  const res = http.post(`${BASE_URL}/v1/transactions`, payload, params);
  transactionDuration.add(res.timings.duration);

  const success = check(res, {
    'status is 201 or 409 or 429': (r) => r.status === 201 || r.status === 409 || r.status === 429,
    'has transaction id': (r) => r.status === 201 && JSON.parse(r.body).data?.id !== undefined,
  });

  createTransactionFailureRate.add(!success);

  if (res.status === 201) {
    const body = JSON.parse(res.body);
    const txnId = body.data.id;

    const getRes = http.get(`${BASE_URL}/v1/transactions/${txnId}`, params);
    check(getRes, {
      'get transaction status is 200': (r) => r.status === 200,
      'transaction id matches': (r) => JSON.parse(r.body).data?.id === txnId,
    });

    const captureRes = http.post(
      `${BASE_URL}/v1/transactions/${txnId}/capture`,
      JSON.stringify({ amount: body.data.amount }),
      params
    );
    check(captureRes, {
      'capture status is 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
