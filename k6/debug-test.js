import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://payment-gateway:3001';
const API_KEY = 'pk_test_abcdef123456';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const payload = JSON.stringify({
    amount: 1000,
    currency: 'USD',
    description: `debug test`,
    source: {
      type: 'card',
      cardNumber: '4111111111111111',
      cardExpiry: '12/28',
      cardCvv: '123',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  console.log('Sending payload: ' + payload);

  const res = http.post(`${BASE_URL}/v1/transactions`, payload, params);

  console.log('Status: ' + res.status);
  console.log('Body: ' + res.body);
  console.log('Headers: ' + JSON.stringify(res.headers));
}
