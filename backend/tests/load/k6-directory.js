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
    const searchTerms = ['tech', 'steel', 'manufacturing', 'textile'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    // Simulating public directory search
    const res = http.get(`${BASE_URL}/network/profile/search?q=${randomTerm}&limit=20`, { headers: getHeaders() });
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'search time OK': (r) => r.timings.duration < 300,
    });

    sleep(1);
}
