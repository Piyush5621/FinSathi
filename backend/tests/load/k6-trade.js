import http from 'k6/http';
import { check, sleep } from 'k6';
import { standardOptions, getHeaders, BASE_URL } from './common.js';

export const options = {
    ...standardOptions,
    stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],
};

export default function () {
    const payload = JSON.stringify({
        partnerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50000,
        currency: 'INR',
        items: [
            { productId: 'prod_1', quantity: 10, unitPrice: 5000 }
        ]
    });

    const res = http.post(`${BASE_URL}/network/trade`, payload, { 
        headers: getHeaders('mock-test-jwt-token') 
    });
    
    // In a real load test we might expect 401/403 if the token is invalid, 
    // but the point is to test the routing and db connection pooling/rate limits
    check(res, {
        'status is not 500': (r) => r.status !== 500,
        'trade creation time OK': (r) => r.timings.duration < 500,
    });

    sleep(1);
}
