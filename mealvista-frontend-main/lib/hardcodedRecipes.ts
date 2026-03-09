export const SEASONAL_RECIPES = [
    {
        id: 'seasonal-1',
        title: 'Spring Lemon Asparagus Pasta',
        image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800',
        time: 25,
        calories: 420,
        difficulty: 'Easy',
        rating: 4.8,
        category: 'Seasonal',
        recipeData: {
            ingredients: ['1 lb Asparagus', '8 oz Pasta', '1 Lemon', '2 tbsp Olive Oil', 'Parmesan'],
            instructions: ['Boil pasta', 'Sauté asparagus', 'Mix with lemon juice and oil', 'Top with cheese'],
            macros: { protein: 12, carbs: 60, fat: 15, fiber: 6 },
        }
    },
    {
        id: 'seasonal-2',
        title: 'Roasted Spring Vegetable Bowl',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        time: 35,
        calories: 380,
        difficulty: 'Medium',
        rating: 4.7,
        category: 'Seasonal',
        recipeData: {
            ingredients: ['1 cup Quinoa', 'Carrots', 'Brussels Sprouts', 'Tahini Dressing'],
            instructions: ['Roast vegetables at 400F', 'Cook quinoa', 'Assemble bowl', 'Drizzle dressing'],
            macros: { protein: 14, carbs: 55, fat: 12, fiber: 10 },
        }
    },
    {
        id: 'seasonal-3',
        title: 'Strawberry Spinach Salad',
        image: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800',
        time: 15,
        calories: 250,
        difficulty: 'Easy',
        rating: 4.9,
        category: 'Seasonal',
        recipeData: {
            ingredients: ['6 oz Baby Spinach', '1 cup Strawberries', '1/4 cup Pecans', 'Balsamic Vinaigrette'],
            instructions: ['Wash spinach', 'Slice strawberries', 'Toast pecans', 'Toss with dressing'],
            macros: { protein: 5, carbs: 20, fat: 18, fiber: 7 },
        }
    },
    {
        id: 'seasonal-4',
        title: 'Garlic Butter Salmon',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
        time: 20,
        calories: 450,
        difficulty: 'Medium',
        rating: 4.9,
        category: 'Seasonal',
        recipeData: {
            ingredients: ['2 Salmon fillets', '3 cloves Garlic', '2 tbsp Butter', 'Fresh Parsley'],
            instructions: ['Season salmon', 'Melt butter and sauté garlic', 'Pan sear salmon', 'Baste with garlic butter'],
            macros: { protein: 34, carbs: 2, fat: 32, fiber: 0 },
        }
    }
];

export const CATEGORY_RECIPES: Record<string, any[]> = {
    pakistani: [
        {
            id: 'pak-1',
            title: 'Authentic Chicken Biryani',
            image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
            time: 60,
            calories: 650,
            difficulty: 'Hard',
            rating: 4.9,
            category: 'Pakistani',
            recipeData: {
                ingredients: ['2 cups Basmati Rice', '500g Chicken', 'Biryani Masala', 'Yogurt', 'Onions'],
                instructions: ['Marinate chicken', 'Fry onions', 'Parboil rice', 'Layer and steam (dum)'],
                macros: { protein: 35, carbs: 75, fat: 22, fiber: 4 },
            }
        },
        {
            id: 'pak-2',
            title: 'Spicy Beef Karahi',
            image: 'https://images.unsplash.com/photo-1585937421612-70a008356136?w=800',
            time: 45,
            calories: 580,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Pakistani',
            recipeData: {
                ingredients: ['500g Beef', '4 Tomatoes', 'Green Chilies', 'Ginger', 'Karahi Masala'],
                instructions: ['Cook beef until tender', 'Add tomatoes and spices', 'Stir-fry on high heat', 'Garnish with ginger'],
                macros: { protein: 42, carbs: 12, fat: 35, fiber: 3 },
            }
        },
        {
            id: 'pak-3',
            title: 'Daal Makhani',
            image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',
            time: 120,
            calories: 420,
            difficulty: 'Medium',
            rating: 4.7,
            category: 'Pakistani',
            recipeData: {
                ingredients: ['1 cup Black Lentils', 'Kidney Beans', 'Butter', 'Cream', 'Tomato Puree'],
                instructions: ['Soak lentils', 'Slow cook for 2 hours', 'Add spices and puree', 'Finish with butter and cream'],
                macros: { protein: 18, carbs: 45, fat: 20, fiber: 15 },
            }
        },
        {
            id: 'pak-4',
            title: 'Seekh Kebab',
            image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800',
            time: 30,
            calories: 320,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Pakistani',
            recipeData: {
                ingredients: ['500g Minced Meat', 'Onion', 'Green Chili', 'Coriander', 'Kebab Spices'],
                instructions: ['Mix ingredients', 'Mold onto skewers', 'Grill until browned', 'Serve with chutney'],
                macros: { protein: 28, carbs: 5, fat: 22, fiber: 2 },
            }
        }
    ],
    italian: [
        {
            id: 'ita-1',
            title: 'Margherita Pizza',
            image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
            time: 90,
            calories: 550,
            difficulty: 'Medium',
            rating: 4.9,
            category: 'Italian',
            recipeData: {
                ingredients: ['Pizza Dough', 'San Marzano Tomatoes', 'Fresh Mozzarella', 'Basil', 'Olive Oil'],
                instructions: ['Stretch dough', 'Spread tomatoes', 'Add cheese', 'Bake at highest heat', 'Top with basil'],
                macros: { protein: 20, carbs: 65, fat: 22, fiber: 5 },
            }
        },
        {
            id: 'ita-2',
            title: 'Spaghetti Carbonara',
            image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
            time: 25,
            calories: 620,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Italian',
            recipeData: {
                ingredients: ['Spaghetti', 'Guanciale', 'Pecorino Romano', 'Eggs', 'Black Pepper'],
                instructions: ['Boil pasta', 'Fry guanciale', 'Mix eggs and cheese', 'Combine all off heat'],
                macros: { protein: 25, carbs: 58, fat: 30, fiber: 3 },
            }
        },
        {
            id: 'ita-3',
            title: 'Classic Lasagna',
            image: 'https://images.unsplash.com/photo-1619895092538-128341789043?w=800',
            time: 120,
            calories: 750,
            difficulty: 'Hard',
            rating: 4.9,
            category: 'Italian',
            recipeData: {
                ingredients: ['Lasagna Noodles', 'Bolognese Sauce', 'Bechamel', 'Parmesan'],
                instructions: ['Make sauces', 'Layer noodles, meat, and bechamel', 'Bake for 45 mins'],
                macros: { protein: 40, carbs: 50, fat: 42, fiber: 4 },
            }
        },
        {
            id: 'ita-4',
            title: 'Tiramisu',
            image: 'https://images.unsplash.com/photo-1571115177098-24c42d5e056c?w=800',
            time: 40,
            calories: 450,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Italian',
            recipeData: {
                ingredients: ['Ladyfingers', 'Mascarpone', 'Espresso', 'Eggs', 'Cocoa Powder'],
                instructions: ['Whip mascarpone and eggs', 'Dip ladyfingers in coffee', 'Layer', 'Chill then dust with cocoa'],
                macros: { protein: 8, carbs: 45, fat: 28, fiber: 2 },
            }
        }
    ],
    chinese: [
        {
            id: 'chn-1',
            title: 'Kung Pao Chicken',
            image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800',
            time: 30,
            calories: 480,
            difficulty: 'Medium',
            rating: 4.7,
            category: 'Chinese',
            recipeData: {
                ingredients: ['Chicken Breast', 'Peanuts', 'Dried Chilies', 'Soy Sauce', 'Sichuan Peppercorns'],
                instructions: ['Dice and marinate chicken', 'Stir-fry chicken', 'Add peanuts and sauce'],
                macros: { protein: 35, carbs: 20, fat: 28, fiber: 4 },
            }
        },
        {
            id: 'chn-2',
            title: 'Beef and Broccoli',
            image: 'https://images.unsplash.com/photo-1623689048105-a17b1e19401e?w=800',
            time: 25,
            calories: 420,
            difficulty: 'Easy',
            rating: 4.6,
            category: 'Chinese',
            recipeData: {
                ingredients: ['Flank Steak', 'Broccoli Florets', 'Oyster Sauce', 'Garlic', 'Ginger'],
                instructions: ['Thinly slice beef', 'Blanch broccoli', 'Stir-fry beef', 'Combine with sauce'],
                macros: { protein: 32, carbs: 18, fat: 22, fiber: 6 },
            }
        },
        {
            id: 'chn-3',
            title: 'Peking Duck',
            image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
            time: 240,
            calories: 680,
            difficulty: 'Hard',
            rating: 4.9,
            category: 'Chinese',
            recipeData: {
                ingredients: ['Whole Duck', 'Maltose', 'Hoisin Sauce', 'Spring Onion', 'Pancakes'],
                instructions: ['Dry duck overnight', 'Glaze with maltose', 'Roast until crispy', 'Serve with pancakes'],
                macros: { protein: 38, carbs: 45, fat: 42, fiber: 3 },
            }
        },
        {
            id: 'chn-4',
            title: 'Vegetable Dumplings',
            image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800',
            time: 60,
            calories: 320,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Chinese',
            recipeData: {
                ingredients: ['Dumpling Wrappers', 'Cabbage', 'Mushrooms', 'Carrots', 'Soy Sauce'],
                instructions: ['Finely chop veg', 'Fill wrappers and fold', 'Steam or pan-fry'],
                macros: { protein: 10, carbs: 55, fat: 5, fiber: 8 },
            }
        }
    ],
    mexican: [
        {
            id: 'mex-1',
            title: 'Classic Beef Tacos',
            image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
            time: 20,
            calories: 450,
            difficulty: 'Easy',
            rating: 4.7,
            category: 'Mexican',
            recipeData: {
                ingredients: ['Ground Beef', 'Taco Shells', 'Lettuce', 'Cheese', 'Salsa'],
                instructions: ['Brown beef', 'Add taco seasoning', 'Assemble tacos', 'Top with cheese and salsa'],
                macros: { protein: 25, carbs: 30, fat: 24, fiber: 5 },
            }
        },
        {
            id: 'mex-2',
            title: 'Chicken Enchiladas',
            image: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800',
            time: 45,
            calories: 520,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Mexican',
            recipeData: {
                ingredients: ['Shredded Chicken', 'Corn Tortillas', 'Enchilada Sauce', 'Monterey Jack', 'Sour Cream'],
                instructions: ['Fill tortillas with chicken', 'Roll and place in dish', 'Cover with sauce and cheese', 'Bake'],
                macros: { protein: 32, carbs: 40, fat: 25, fiber: 6 },
            }
        },
        {
            id: 'mex-3',
            title: 'Guacamole & Chips',
            image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800',
            time: 15,
            calories: 380,
            difficulty: 'Easy',
            rating: 4.9,
            category: 'Mexican',
            recipeData: {
                ingredients: ['Avocados', 'Lime', 'Red Onion', 'Cilantro', 'Tortilla Chips'],
                instructions: ['Mash avocados', 'Mix in chopped onion and cilantro', 'Season with lime and salt'],
                macros: { protein: 5, carbs: 35, fat: 28, fiber: 12 },
            }
        },
        {
            id: 'mex-4',
            title: 'Authentic Fajitas',
            image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=800',
            time: 30,
            calories: 480,
            difficulty: 'Medium',
            rating: 4.7,
            category: 'Mexican',
            recipeData: {
                ingredients: ['Skirt Steak', 'Bell Peppers', 'Onions', 'Fajita Seasoning', 'Flour Tortillas'],
                instructions: ['Slice meat and veg thinly', 'Cook meat quickly', 'Sauté veg', 'Serve sizzling'],
                macros: { protein: 35, carbs: 42, fat: 18, fiber: 5 },
            }
        }
    ],
    thai: [
        {
            id: 'tha-1',
            title: 'Pad Thai',
            image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
            time: 30,
            calories: 550,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Thai',
            recipeData: {
                ingredients: ['Rice Noodles', 'Shrimp', 'Eggs', 'Bean Sprouts', 'Peanuts', 'Pad Thai Sauce'],
                instructions: ['Soak noodles', 'Stir fry shrimp and eggs', 'Add noodles and sauce', 'Toss with bean sprouts'],
                macros: { protein: 28, carbs: 70, fat: 18, fiber: 4 },
            }
        },
        {
            id: 'tha-2',
            title: 'Green Curry',
            image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
            time: 35,
            calories: 480,
            difficulty: 'Medium',
            rating: 4.7,
            category: 'Thai',
            recipeData: {
                ingredients: ['Chicken breast', 'Green Curry Paste', 'Coconut Milk', 'Bamboo Shoots', 'Thai Basil'],
                instructions: ['Fry curry paste', 'Add chicken and coconut milk', 'Simmer with bamboo', 'Stir in basil'],
                macros: { protein: 30, carbs: 15, fat: 34, fiber: 5 },
            }
        },
        {
            id: 'tha-3',
            title: 'Tom Yum Soup',
            image: 'https://images.unsplash.com/photo-1548943487-a2e4142f9df8?w=800',
            time: 25,
            calories: 220,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Thai',
            recipeData: {
                ingredients: ['Shrimp', 'Lemongrass', 'Galangal', 'Kaffir Lime Leaves', 'Chili Paste'],
                instructions: ['Boil aromatics', 'Add shrimp and mushrooms', 'Season with fish sauce and lime'],
                macros: { protein: 22, carbs: 12, fat: 8, fiber: 3 },
            }
        },
        {
            id: 'tha-4',
            title: 'Mango Sticky Rice',
            image: 'https://images.unsplash.com/photo-1563514965251-2485501062f4?w=800',
            time: 45,
            calories: 410,
            difficulty: 'Easy',
            rating: 4.9,
            category: 'Thai',
            recipeData: {
                ingredients: ['Glutinous Rice', 'Ripe Mango', 'Coconut Milk', 'Sugar', 'Salt'],
                instructions: ['Steam sticky rice', 'Warm coconut milk and sugar', 'Mix with rice', 'Serve with sliced mango'],
                macros: { protein: 5, carbs: 85, fat: 12, fiber: 3 },
            }
        }
    ],
    mediterranean: [
        {
            id: 'med-1',
            title: 'Greek Salad',
            image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
            time: 15,
            calories: 320,
            difficulty: 'Easy',
            rating: 4.7,
            category: 'Mediterranean',
            recipeData: {
                ingredients: ['Cucumbers', 'Tomatoes', 'Red Onion', 'Kalamata Olives', 'Feta Cheese', 'Olive Oil'],
                instructions: ['Chop vegetables', 'Toss with olives and cheese', 'Dress with olive oil and oregano'],
                macros: { protein: 8, carbs: 12, fat: 28, fiber: 4 },
            }
        },
        {
            id: 'med-2',
            title: 'Chicken Souvlaki',
            image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdf?w=800',
            time: 40,
            calories: 450,
            difficulty: 'Medium',
            rating: 4.8,
            category: 'Mediterranean',
            recipeData: {
                ingredients: ['Chicken Breast', 'Lemon', 'Oregano', 'Pita Bread', 'Tzatziki'],
                instructions: ['Marinate chicken', 'Thread onto skewers', 'Grill until cooked', 'Serve with pita and tzatziki'],
                macros: { protein: 45, carbs: 30, fat: 15, fiber: 4 },
            }
        },
        {
            id: 'med-3',
            title: 'Moussaka',
            image: 'https://images.unsplash.com/photo-1633512216584-cbe4ea408ba5?w=800',
            time: 90,
            calories: 580,
            difficulty: 'Hard',
            rating: 4.9,
            category: 'Mediterranean',
            recipeData: {
                ingredients: ['Eggplant', 'Ground Lamb', 'Tomato Sauce', 'Bechamel', 'Parmesan'],
                instructions: ['Roast eggplant slices', 'Cook lamb sauce', 'Layer in dish with bechamel', 'Bake'],
                macros: { protein: 32, carbs: 35, fat: 38, fiber: 8 },
            }
        },
        {
            id: 'med-4',
            title: 'Falafel Wrap',
            image: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800',
            time: 35,
            calories: 490,
            difficulty: 'Medium',
            rating: 4.7,
            category: 'Mediterranean',
            recipeData: {
                ingredients: ['Chickpeas', 'Parsley', 'Garlic', 'Cumin', 'Pita Bread', 'Hummus'],
                instructions: ['Blend falafel mix', 'Form balls and fry', 'Spread hummus on pita', 'Assemble wrap'],
                macros: { protein: 18, carbs: 65, fat: 22, fiber: 14 },
            }
        }
    ]
};
