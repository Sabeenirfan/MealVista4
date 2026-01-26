const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const gmailRegex = /^[\w.+-]+@gmail\.com$/i;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    // SECURITY: Always create as regular user - admins are created manually in MongoDB
    // No role or adminCode should be accepted from signup

    // Validation
    if (!trimmedName || !trimmedEmail || !rawPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    if (!gmailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Email must be a valid Gmail address' });
    }

    if (!passwordRegex.test(rawPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number',
      });
    }

    // Check if user exists (including deleted users - prevent re-registration)
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      if (existingUser.isDeleted) {
        return res.status(400).json({ 
          message: 'This email was previously registered and cannot be used again' 
        });
      }
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Create user - always as regular user (isAdmin: false, role: 'user')
    const user = new User({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      role: 'user',
      isAdmin: false
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.isAdmin || false
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const trimmedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    // Validation
    if (!trimmedEmail || !rawPassword) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user (exclude deleted users)
    const user = await User.findOne({ email: trimmedEmail, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
      return res.status(403).json({ 
        message: `Account locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s)` 
      });
    }

    // Reset lock if time has passed
    if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();
    }

    // Check if user registered with Google
    if (!user.password) {
      return res.status(400).json({ 
        message: 'Please login with Google' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(rawPassword, user.password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;

      // Lock account after 3 failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 3) {
        user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();
        return res.status(403).json({ 
          message: 'Account locked due to 3 failed login attempts. Try again in 15 minutes or reset your password.' 
        });
      }

      await user.save();
      const attemptsLeft = 3 - user.failedLoginAttempts;
      return res.status(401).json({ 
        message: `Invalid email or password. ${attemptsLeft} attempt(s) remaining`,
        attemptsRemaining: attemptsLeft
      });
    }

    // Successful login - reset failed attempts
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.isAdmin || false
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PROFILE
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, isDeleted: { $ne: true } }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt,
        dietaryPreferences: user.dietaryPreferences || [],
        allergens: user.allergens || [],
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        bmiCategory: user.bmiCategory
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE PROFILE
router.put('/me', auth, async (req, res) => {
  try {
    const { name, email, dietaryPreferences, allergens, height, weight, bmi, bmiCategory, healthGoal } = req.body;

    const user = await User.findOne({ _id: req.userId, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update name if provided
    if (name !== undefined) {
      const trimmedName = String(name || '').trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      user.name = trimmedName;
    }

    // Update email if provided
    if (email !== undefined) {
      const trimmedEmail = String(email || '').trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ message: 'Email cannot be empty' });
      }
      
      if (!gmailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Email must be a valid Gmail address' });
      }

      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: trimmedEmail, 
        _id: { $ne: req.userId },
        isDeleted: { $ne: true }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      user.email = trimmedEmail;
    }

    // Update dietary preferences if provided
    if (dietaryPreferences !== undefined) {
      user.dietaryPreferences = Array.isArray(dietaryPreferences) ? dietaryPreferences : [];
    }

    // Update allergens if provided
    if (allergens !== undefined) {
      user.allergens = Array.isArray(allergens) ? allergens : [];
    }

    // Update height if provided
    if (height !== undefined) {
      user.height = height ? Number(height) : null;
    }

    // Update weight if provided
    if (weight !== undefined) {
      user.weight = weight ? Number(weight) : null;
    }

    // Update BMI if provided
    if (bmi !== undefined) {
      user.bmi = bmi ? Number(bmi) : null;
    }

    // Update BMI category if provided
    if (bmiCategory !== undefined) {
      user.bmiCategory = bmiCategory || null;
    }

    // Update health goal if provided
    if (healthGoal !== undefined) {
      if (healthGoal && !['weight_loss', 'weight_gain', 'maintenance'].includes(healthGoal)) {
        return res.status(400).json({ message: 'Invalid health goal. Must be weight_loss, weight_gain, or maintenance' });
      }
      user.healthGoal = healthGoal || null;
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt,
        dietaryPreferences: user.dietaryPreferences || [],
        allergens: user.allergens || [],
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        bmiCategory: user.bmiCategory
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;