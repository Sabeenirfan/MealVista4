const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables FIRST
const envResult = dotenv.config({ path: path.resolve(__dirname, '.env') });

if (envResult.error) {
  console.warn('⚠️  Warning: .env file not found or has errors');
  console.warn('Creating .env file with default values...');
}

// Verify critical environment variables
if (!process.env.MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI is not set in environment variables');
  console.error('Please create a .env file in the backend directory with:');
  console.error('MONGO_URI=mongodb://localhost:27017/mealvista');
  console.error('\nFor MongoDB Atlas, use:');
  console.error('MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mealvista');
  process.exit(1);
}

const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

const corsOptions = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Import routes (without passport for now)
const authRoutes = require('./routes/auth');
const googleAuth = require('./routes/google');
const adminRoutes = require('./routes/admin');
const inventoryRoutes = require('./routes/inventory');
const otpAuthRoutes = require('./routes/otp-auth');
const recipesRoutes = require('./routes/recipes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuth);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/otp-auth', otpAuthRoutes); // New OTP-based auth routes
app.use('/api/recipes', recipesRoutes); // Recipes API

app.get('/', (req, res) => {
  res.json({ 
    message: 'MealVista API is running',
    timestamp: new Date().toISOString(),
    mongodb: 'connected'
  });
});

// Test endpoint for connection verification
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
});

const PORT = process.env.PORT || 5000;

// Get network IP address for display
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let networkIP = 'localhost';

// Find the first non-internal IPv4 address
for (const interfaceName in networkInterfaces) {
  const addresses = networkInterfaces[interfaceName];
  for (const address of addresses) {
    if (address.family === 'IPv4' && !address.internal) {
      networkIP = address.address;
      break;
    }
  }
  if (networkIP !== 'localhost') break;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ Server running successfully!');
  console.log(`🌐 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${networkIP}:${PORT}`);
  console.log(`📡 Test:   http://localhost:${PORT}/api/test`);
  console.log('');
  console.log(`📱 Frontend should connect to: http://${networkIP}:${PORT}`);
  console.log('');
});