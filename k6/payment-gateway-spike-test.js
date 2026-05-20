import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://payment-gateway:3001';
const API_KEY = 'pk_test_abcdef123456';

export const options = {
  stages: [
    { duration: '10s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const payload = JSON.stringify({
    amount: Math.floor(Math.random() * 10000) + 100,
    currency: 'USD',
    description: `k6 spike test ${Date.now()}`,
    cardNumber: '4111111111111111',
    cardExpiry: '12/28',
    cardCvv: '123',
    metadata: { test: 'k6-spike', run_id: `${Date.now()}` },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    timeout: '15s',
  };

  const res = http.post(`${BASE_URL}/v1/transactions`, payload, params);

  check(res, {
    'status is 201 or 409 or 429': (r) => r.status === 201 || r.status === 409 || r.status === 429,
  });

  sleep(0.5);
}
