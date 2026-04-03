const express = require('express');
const Stripe = require('stripe');
const auth = require('../middleware/auth');

const router = express.Router();

const zeroDecimalCurrencies = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

const toSmallestUnit = (amount, currency) => {
  const normalizedCurrency = String(currency || 'usd').toLowerCase();
  if (zeroDecimalCurrencies.has(normalizedCurrency)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
};

router.post('/create-intent', auth, async (req, res) => {
  try {
    const { amount, currency = process.env.STRIPE_CURRENCY || 'usd', metadata = {} } = req.body || {};

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Stripe secret key is not configured',
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid positive number',
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toSmallestUnit(numericAmount, currency),
      currency: String(currency).toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        userId: String(req.userId),
        ...metadata,
      },
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not create Stripe payment intent',
      error: error.message,
    });
  }
});

module.exports = router;
