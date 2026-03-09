const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', default: null },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    unitPrice: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, default: 'unit' },
    image: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    itemCount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'],
        default: 'pending',
    },
    paymentMethod: { type: String, default: 'cash_on_delivery' },
    notes: { type: String, default: '' },
    estimatedDelivery: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);
