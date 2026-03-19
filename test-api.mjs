import http from 'http';

const data = JSON.stringify({
  type: 'email',
  priority: 'high',
  data: { to: 'test@example.com' }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/jobs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'default-dev-key',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', (e) => console.error('ERROR:', e.message));
req.write(data);
req.end();
