const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/cron/daily-bill',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer daily_law_secure_cron_secret_12345'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('BODY:');
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
