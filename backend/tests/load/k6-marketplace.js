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
    const categories = ['electronics', 'apparel', 'hardware', 'groceries'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Simulate marketplace search which hits Redis cache mostly
    const res = http.get(`${BASE_URL}/network/marketplace?category=${randomCategory}&limit=20`, { headers: getHeaders() });
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'search time OK': (r) => r.timings.duration < 300,
    });

    sleep(Math.random() * 2);
}
