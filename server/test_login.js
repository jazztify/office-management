const http = require('http');

const data = JSON.stringify({
  email: 'admin@system.com',
  password: 'adminpassword123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-tenant-id': 'admin'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log('Body:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error.message);
});

req.write(data);
req.end();
