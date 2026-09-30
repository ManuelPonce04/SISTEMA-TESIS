const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 1, es_admin: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

const req = http.request('http://localhost:3001/api/estudiantes?query=perez', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});

req.on('error', console.error);
req.end();
