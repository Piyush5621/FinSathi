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
    const partnerId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Fetching trust score profile (heavily cached)
    const res = http.get(`${BASE_URL}/network/reputation/${partnerId}`, { 
        headers: getHeaders('mock-test-jwt-token') 
    });
    
    check(res, {
        'status is not 500': (r) => r.status !== 500,
        'reputation fetch time OK': (r) => r.timings.duration < 200,
    });

    sleep(1);
}
