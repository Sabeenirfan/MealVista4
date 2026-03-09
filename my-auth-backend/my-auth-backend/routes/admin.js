const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get all users (Admin only) - exclude deleted users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } })
      .select('-password -googleId')
      .sort({ createdAt: -1 }); // Newest first

    const usersWithId = users.map(user => ({
      ...user.toObject(),
      id: user._id.toString()
    }));

    res.json({
      success: true,
      count: usersWithId.length,
      users: usersWithId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get user by ID (Admin only)
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -googleId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update user status (Admin only)
router.patch('/users/:id', adminAuth, async (req, res) => {
  try {
    const { isAdmin, role } = req.body;
    const updates = {};
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    if (role !== undefined) updates.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).select('-password -googleId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Delete user (Admin only) - Soft delete
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isDeleted) return res.status(400).json({ success: false, message: 'User is already deleted' });

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── ORDER MANAGEMENT ──────────────────────────────────────────

/**
 * GET /api/admin/orders
 * Get all orders with optional status filter, paginated.
 */
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = status && status !== 'all' ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    // Enrich with user info
    const userIds = [...new Set(orders.map(o => o.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = orders.map(o => ({
      id: o._id,
      status: o.status,
      totalAmount: o.totalAmount,
      itemCount: o.itemCount,
      items: o.items,
      paymentMethod: o.paymentMethod,
      estimatedDelivery: o.estimatedDelivery,
      createdAt: o.createdAt,
      user: userMap[o.userId?.toString()] || { name: 'Unknown', email: '' },
    }));

    res.json({ success: true, orders: enriched, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

/**
 * PATCH /api/admin/orders/:id
 * Update order status.
 */
router.patch('/orders/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${valid.join(', ')}` });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    console.log(`✅ [Admin] Order ${order._id} status updated to "${status}"`);
    res.json({ success: true, message: `Order status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
});

// ─── SALES ANALYTICS ───────────────────────────────────────────

/**
 * GET /api/admin/sales
 * Aggregate revenue stats: total, today, this week, this month.
 */
router.get('/sales', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [all, today, week, month, lastMonth, byStatus, recentOrders] = await Promise.all([
      Order.aggregate([{ $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 }, items: { $sum: '$itemCount' } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: startOfToday } } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: startOfWeek } } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }]),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Month-over-month growth
    const thisMonthRevenue = month[0]?.revenue || 0;
    const lastMonthRevenue = lastMonth[0]?.revenue || 0;
    const growth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : null;

    res.json({
      success: true,
      stats: {
        total: { revenue: all[0]?.revenue || 0, orders: all[0]?.count || 0, items: all[0]?.items || 0 },
        today: { revenue: today[0]?.revenue || 0, orders: today[0]?.count || 0 },
        week: { revenue: week[0]?.revenue || 0, orders: week[0]?.count || 0 },
        month: { revenue: thisMonthRevenue, orders: month[0]?.count || 0 },
        growthPercent: growth,
      },
      byStatus: byStatus.reduce((acc, s) => { acc[s._id] = { count: s.count, revenue: s.revenue }; return acc; }, {}),
      recentOrders: recentOrders.map(o => ({ id: o._id, status: o.status, totalAmount: o.totalAmount, itemCount: o.itemCount, createdAt: o.createdAt })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching sales data', error: error.message });
  }
});

// ─── INVENTORY — LOW STOCK ─────────────────────────────────────

/**
 * GET /api/admin/inventory/low-stock
 * Returns items where stock <= minStock, sorted by urgency.
 */
router.get('/inventory/low-stock', adminAuth, async (req, res) => {
  try {
    const items = await Inventory.find({
      $or: [{ status: 'low_stock' }, { status: 'out_of_stock' }]
    }).sort({ stock: 1 }).lean();

    res.json({
      success: true,
      count: items.length,
      items: items.map(i => ({
        id: i._id,
        name: i.name,
        category: i.category,
        stock: i.stock,
        minStock: i.minStock,
        unit: i.unit,
        status: i.status,
        image: i.image,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching low-stock items', error: error.message });
  }
});

module.exports = router;

