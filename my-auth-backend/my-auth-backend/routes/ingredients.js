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

module.exports = router;
