import http from 'k6/http';
import { check, sleep } from 'k6';
import { standardOptions, getHeaders, BASE_URL } from './common.js';

export const options = {
    ...standardOptions,
    // AI has higher latency expectations, adjust thresholds
    thresholds: {
        http_req_duration: ['p(95)<1500', 'p(99)<2500'], 
        http_req_failed: ['rate<0.05'], 
    },
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
    ],
};

export default function () {
    const payload = JSON.stringify({
        query: 'How can I improve my trade reputation?',
        context: 'reputation_advisor'
    });

    const res = http.post(`${BASE_URL}/network/ai/advise`, payload, { 
        headers: getHeaders('mock-test-jwt-token') 
    });
    
    check(res, {
        'status is not 500': (r) => r.status !== 500,
        'ai response time OK': (r) => r.timings.duration < 2500,
    });

    sleep(2);
}
