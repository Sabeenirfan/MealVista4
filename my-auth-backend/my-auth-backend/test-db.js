const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;

console.log('Testing MongoDB connection using MONGO_URI:', mongoUri);

(async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connection successful');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection failed:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
