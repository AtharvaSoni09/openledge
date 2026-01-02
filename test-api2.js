const http = require('http');
const fs = require('fs');

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

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('FULL RESPONSE:');
        console.log(data);
        fs.writeFileSync('api-error.txt', `STATUS: ${res.statusCode}\n\n${data}`);
        console.log('\nWritten to api-error.txt');
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
