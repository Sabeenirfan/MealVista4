const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not Google user
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    sparse: true
  },
  profilePicture: String,
  // Health and Dietary Preferences
  dietaryPreferences: {
    type: [String],
    default: []
  },
  allergens: {
    type: [String],
    default: []
  },
  height: {
    type: Number,
    default: null
  },
  weight: {
    type: Number,
    default: null
  },
  bmi: {
    type: Number,
    default: null
  },
  bmiCategory: {
    type: String,
    default: null
  },
  healthGoal: {
    type: String,
    enum: ['weight_loss', 'weight_gain', 'maintenance'],
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  passwordResetAt: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Google users have email auto-verified
userSchema.pre('save', function(next) {
  if (this.googleId && !this.isEmailVerified) {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
