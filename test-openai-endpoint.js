const http = require('http');
const fs = require('fs');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/test-openai',
    method: 'GET'
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
        fs.writeFileSync('test-openai-result.txt', `STATUS: ${res.statusCode}\n\n${data}`);
        console.log('\nWritten to test-openai-result.txt');
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
