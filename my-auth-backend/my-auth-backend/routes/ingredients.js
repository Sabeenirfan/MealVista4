const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

/**
 * GET /api/ingredients/catalog
 * Public endpoint — returns available ingredients for the user-facing catalog.
 * Supports ?category=X&search=Y&page=N&limit=N
 */
router.get('/catalog', async (req, res) => {
    try {
        const { category, search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = { available: true, stock: { $gt: 0 } };

        if (category && category !== 'All') {
            query.category = { $regex: `^${category}$`, $options: 'i' };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { subcategory: { $regex: search, $options: 'i' } },
            ];
        }

        const [items, total, categories] = await Promise.all([
            Inventory.find(query)
                .sort({ category: 1, name: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Inventory.countDocuments(query),
            Inventory.distinct('category', { available: true, stock: { $gt: 0 } }),
        ]);

        const mappedItems = items.map(item => ({
            id: item._id.toString(),
            name: item.name,
            category: item.category,
            subcategory: item.subcategory || '',
            unit: item.unit,
            price: item.price,
            stock: item.stock,
            status: item.status,
            description: item.description || '',
            origin: item.origin || '',
            image: item.image || '',
        }));

        res.json({
            success: true,
            items: mappedItems,
            categories: ['All', ...categories.sort()],
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error('[Ingredients Catalog] Error:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching catalog', error: error.message });
    }
});

/**
 * POST /api/ingredients/add-to-cart
 * Reserve one unit of an ingredient for cart by decreasing stock atomically.
 * Body: { ingredientId }
 */
router.post('/add-to-cart', async (req, res) => {
    try {
        const { ingredientId } = req.body;

        if (!ingredientId || typeof ingredientId !== 'string' || !ingredientId.trim()) {
            return res.status(400).json({
                success: false,
                message: 'ingredientId is required',
            });
        }

        const updatedItem = await Inventory.findOneAndUpdate(
            { _id: ingredientId.trim(), available: true, stock: { $gt: 0 } },
            { $inc: { stock: -1 } },
            { new: true }
        ).lean();

        if (!updatedItem) {
            const exists = await Inventory.findById(ingredientId.trim()).lean();
            if (!exists) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingredient not found in inventory',
                });
            }

            return res.status(409).json({
                success: false,
                message: 'Out of Stock',
            });
        }

        res.json({
            success: true,
            message: 'Ingredient added to cart',
            item: {
                id: updatedItem._id.toString(),
                name: updatedItem.name,
                price: updatedItem.price || 0,
                category: updatedItem.category || '',
                image: updatedItem.image || '',
                unit: updatedItem.unit || 'unit',
                stock: updatedItem.stock,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error while adding ingredient to cart',
            error: error.message,
        });
    }
});

/**
 * POST /api/ingredients/release-from-cart
 * Release reserved quantity back to inventory stock.
 * Body: { ingredientId, quantity }
 */
router.post('/release-from-cart', async (req, res) => {
    try {
        const { ingredientId, quantity = 1 } = req.body;

        if (!ingredientId || typeof ingredientId !== 'string' || !ingredientId.trim()) {
            return res.status(400).json({
                success: false,
                message: 'ingredientId is required',
            });
        }

        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'quantity must be a positive number',
            });
        }

        const updatedItem = await Inventory.findByIdAndUpdate(
            ingredientId.trim(),
            { $inc: { stock: qty } },
            { new: true }
        ).lean();

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'Ingredient not found in inventory',
            });
        }

        res.json({
            success: true,
            message: 'Inventory stock restored',
            item: {
                id: updatedItem._id.toString(),
                stock: updatedItem.stock,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error while releasing ingredient from cart',
            error: error.message,
        });
    }
});

module.exports = router;
