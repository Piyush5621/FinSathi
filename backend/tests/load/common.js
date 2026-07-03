export const standardOptions = {
    thresholds: {
        http_req_duration: ['p(50)<300', 'p(95)<500', 'p(99)<700'], // Performance budgets
        http_req_failed: ['rate<0.01'], // Less than 1% errors
    },
};

export const getHeaders = (token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const BASE_URL = __ENV.API_URL || 'http://localhost:5001/api';
