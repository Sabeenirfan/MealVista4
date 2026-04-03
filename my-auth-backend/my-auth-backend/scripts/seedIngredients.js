const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Inventory = require('../models/Inventory');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const ingredients = [
  { name: 'Onion', category: 'vegetable', price: 80, stock: 120, unit: 'kg', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600' },
  { name: 'Tomato', category: 'vegetable', price: 95, stock: 110, unit: 'kg', image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600' },
  { name: 'Potato', category: 'vegetable', price: 70, stock: 200, unit: 'kg', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600' },
  { name: 'Garlic', category: 'spice', price: 220, stock: 60, unit: 'kg', image: 'https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=600' },
  { name: 'Ginger', category: 'spice', price: 260, stock: 55, unit: 'kg', image: 'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=600' },
  { name: 'Green Chili', category: 'spice', price: 180, stock: 40, unit: 'kg', image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600' },
  { name: 'Coriander Powder', category: 'spice', price: 420, stock: 35, unit: 'kg', image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600' },
  { name: 'Red Chili Powder', category: 'spice', price: 480, stock: 30, unit: 'kg', image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=600' },
  { name: 'Turmeric Powder', category: 'spice', price: 390, stock: 32, unit: 'kg', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600' },
  { name: 'Chicken Breast', category: 'meat', price: 780, stock: 45, unit: 'kg', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600' },
  { name: 'Beef Mince', category: 'meat', price: 980, stock: 30, unit: 'kg', image: 'https://images.unsplash.com/photo-1603048719539-9ecb08f31f8f?w=600' },
  { name: 'Eggs', category: 'dairy', price: 320, stock: 90, unit: 'packet', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600' },
  { name: 'Milk', category: 'dairy', price: 240, stock: 85, unit: 'L', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600' },
  { name: 'Yogurt', category: 'dairy', price: 290, stock: 70, unit: 'kg', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600' },
  { name: 'Butter', category: 'dairy', price: 520, stock: 25, unit: 'kg', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600' },
  { name: 'Cheddar Cheese', category: 'dairy', price: 1050, stock: 18, unit: 'kg', image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=600' },
  { name: 'Basmati Rice', category: 'grain', price: 310, stock: 140, unit: 'kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
  { name: 'Wheat Flour', category: 'grain', price: 185, stock: 170, unit: 'kg', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600' },
  { name: 'Lentils (Masoor)', category: 'grain', price: 260, stock: 95, unit: 'kg', image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600' },
  { name: 'Chickpeas', category: 'grain', price: 300, stock: 88, unit: 'kg', image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600' },
  { name: 'Cooking Oil', category: 'oil', price: 670, stock: 75, unit: 'L', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600' },
  { name: 'Olive Oil', category: 'oil', price: 1650, stock: 22, unit: 'L', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600' },
  { name: 'Salt', category: 'spice', price: 65, stock: 160, unit: 'kg', image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442f?w=600' },
  { name: 'Black Pepper', category: 'spice', price: 780, stock: 20, unit: 'kg', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600' },
  { name: 'Lemon', category: 'fruit', price: 120, stock: 75, unit: 'kg', image: 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=600' },
  { name: 'Coriander Leaves', category: 'vegetable', price: 90, stock: 50, unit: 'packet', image: 'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?w=600' },
  { name: 'Mint Leaves', category: 'vegetable', price: 85, stock: 45, unit: 'packet', image: 'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?w=600' },
  { name: 'Tomato Ketchup', category: 'condiment', price: 350, stock: 55, unit: 'bottle', image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600' },
  { name: 'Soy Sauce', category: 'condiment', price: 430, stock: 36, unit: 'bottle', image: 'https://images.unsplash.com/photo-1593357849627-cbbc9fda6b05?w=600' },
  { name: 'Vinegar', category: 'condiment', price: 210, stock: 42, unit: 'bottle', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600' }
];

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI.trim());
  console.log('Connected to MongoDB');

  let createdCount = 0;
  let updatedCount = 0;

  for (const ingredient of ingredients) {
    const result = await Inventory.updateOne(
      { name: ingredient.name, category: ingredient.category },
      {
        $set: {
          ...ingredient,
          available: ingredient.stock > 0,
          status: ingredient.stock > 0 ? 'in_stock' : 'out_of_stock',
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) createdCount += 1;
    else if (result.modifiedCount > 0) updatedCount += 1;
  }

  console.log(`Seed complete. Created: ${createdCount}, Updated: ${updatedCount}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
