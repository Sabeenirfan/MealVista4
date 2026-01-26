# How to Fix Network Error - Start Backend Server

## Problem
The network error occurs because **the backend server is not running**.

## Solution

### Step 1: Verify Configuration
✅ Frontend `.env` file: `EXPO_PUBLIC_API_URL=http://192.168.100.11:5000`  
✅ Backend `.env` file: Configured with MongoDB  
✅ MongoDB: Running on port 27017  
❌ Backend Server: **NOT RUNNING**

### Step 2: Start the Backend Server

Open a **new terminal** and run:

```powershell
cd C:\Users\HMS\Downloads\MealVista4\my-auth-backend\my-auth-backend
npm start
```

OR use the start script:

```powershell
cd C:\Users\HMS\Downloads\MealVista4\my-auth-backend\my-auth-backend
node start-server.js
```

### Step 3: Verify Server is Running

You should see:
```
✅ Server running successfully!
🌐 Local:   http://localhost:5000
🌐 Network: http://192.168.100.11:5000
📡 Test:   http://localhost:5000/api/test
📱 Frontend should connect to: http://192.168.100.11:5000
```

### Step 4: Test the Connection

Open another terminal and test:
```powershell
curl http://192.168.100.11:5000/api/test
```

Or visit in browser: `http://192.168.100.11:5000/api/test`

### Step 5: Restart Your Expo App

After the backend server is running, restart your Expo app.

## Configuration Summary

**Backend .env** (`my-auth-backend/my-auth-backend/.env`):
- `MONGO_URI=mongodb://localhost:27017/mealvista`
- `PORT=5000`
- `JWT_SECRET=...` (configured)

**Frontend .env** (`mealvista-frontend-main/.env`):
- `EXPO_PUBLIC_API_URL=http://192.168.100.11:5000`

**Frontend app.json**:
- `apiUrl: "http://192.168.100.11:5000"`

## Troubleshooting

If server still doesn't start:
1. Check MongoDB is running: `netstat -ano | findstr :27017`
2. Install dependencies: `npm install` (in backend directory)
3. Check firewall allows port 5000
4. Verify IP address: `ipconfig` (should show 192.168.100.11)

