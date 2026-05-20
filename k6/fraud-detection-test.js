import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://fraud-detection:8000';

const failureRate = new Rate('fraud_check_failures');

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
    card_last4: '1234',
    merchant_id: 'merchant_k6',
    timestamp: new Date().toISOString(),
    location: 'New York, NY',
    customer_id: 'cust_' + Math.floor(Math.random() * 10000),
    ip_address: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };

  const res = http.post(`${BASE_URL}/analyze`, payload, params);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has risk score': (r) => JSON.parse(r.body).risk_score !== undefined,
    'has decision': (r) => JSON.parse(r.body).decision !== undefined,
  });

  failureRate.add(!success);

  sleep(1);
}
