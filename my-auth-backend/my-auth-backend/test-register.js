const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

(async () => {
  try {
    const timestamp = Date.now();
    const payload = {
      name: `Test User ${timestamp}`,
      email: `testuser${timestamp}@gmail.com`,
      password: `Password1${timestamp.toString().slice(-3)}` // meets regex: upper, lower, digit, >=8
    };

    console.log('Sending signup request to', `${API}/api/auth/signup`);
    const res = await axios.post(`${API}/api/auth/signup`, payload, { timeout: 10000 });
    console.log('Status:', res.status);
    console.log('Body:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Response error status:', err.response.status);
      console.error('Response body:', err.response.data);
    } else {
      console.error('Request failed:', err.message);
    }
    process.exit(1);
  }
})();
