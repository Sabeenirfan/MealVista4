const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

const mongoUri = process.env.MONGO_URI;

(async () => {
  try {
    await mongoose.connect(mongoUri);
    const users = await User.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log(`Found ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`- ${u.email} (${u.name}) createdAt=${u.createdAt}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
