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
        email: `testuser_${__VU}@example.com`,
        password: 'securepassword123',
    });

    const res = http.post(`${BASE_URL}/auth/login`, payload, { headers: getHeaders() });
    
    check(res, {
        'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
        'transaction time OK': (r) => r.timings.duration < 500,
    });

    sleep(1);
}
