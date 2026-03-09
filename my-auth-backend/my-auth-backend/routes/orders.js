const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

/**
 * POST /api/orders
 * Place a new order from the user's cart.
 * Body: { items: [{ name, unitPrice, quantity, category?, image?, ingredientId? }], paymentMethod?, notes? }
 */
router.post('/', auth, async (req, res) => {
    try {
        const { items, paymentMethod, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart items are required' });
        }

        // Validate and build order items
        const orderItems = items.map(item => ({
            ingredientId: item.ingredientId || null,
            name: item.name || 'Unknown Item',
            category: item.category || '',
            unitPrice: Number(item.unitPrice) || 0,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'unit',
            image: item.image || '',
        }));

        const totalAmount = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const itemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0);

        // Deduct inventory stock for real inventory items
        for (const item of orderItems) {
            if (item.ingredientId) {
                try {
                    await Inventory.findByIdAndUpdate(
                        item.ingredientId,
                        { $inc: { stock: -item.quantity } }
                    );
                } catch (e) {
                    // Non-blocking — log but don't fail order
                    console.warn(`[Orders] Could not deduct stock for item ${item.ingredientId}:`, e.message);
                }
            }
        }

        // Estimated delivery: 1 day from now
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 1);

        const order = new Order({
            userId: req.userId,
            items: orderItems,
            totalAmount,
            itemCount,
            paymentMethod: paymentMethod || 'cash_on_delivery',
            notes: notes || '',
            estimatedDelivery,
        });

        await order.save();

        console.log(`✅ [Order] New order ${order._id} — Rs ${totalAmount.toFixed(2)} — ${itemCount} items`);

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: {
                id: order._id,
                status: order.status,
                totalAmount,
                itemCount,
                estimatedDelivery,
                createdAt: order.createdAt,
            },
        });
    } catch (error) {
        console.error('[Orders] POST error:', error.message);
        res.status(500).json({ success: false, message: 'Error placing order', error: error.message });
    }
});

/**
 * GET /api/orders/my-orders
 * Get current user's order history (most recent first).
 */
router.get('/my-orders', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments({ userId: req.userId });

        res.json({
            success: true,
            orders: orders.map(o => ({
                id: o._id,
                status: o.status,
                totalAmount: o.totalAmount,
                itemCount: o.itemCount,
                items: o.items,
                paymentMethod: o.paymentMethod,
                estimatedDelivery: o.estimatedDelivery,
                createdAt: o.createdAt,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('[Orders] GET my-orders error:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
    }
});

/**
 * GET /api/orders/:id
 * Get a specific order by ID (user must own it).
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, userId: req.userId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('[Orders] GET /:id error:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
    }
});

module.exports = router;
