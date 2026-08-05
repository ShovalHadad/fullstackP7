/*
Loads environment variables before importing the database connection.
*/
require("dotenv").config();

const { pool } = require("../config/db");

/*
Run `npm run seed:test-users` first so that
chef@test.com exists before this script runs.
*/
const CHEF_EMAIL = "chef@test.com";

const categories = [
  { name: "Breakfast", description: "Morning meals to start the day" },
  { name: "Main Course", description: "Hearty main dishes" },
  { name: "Dessert", description: "Sweet treats" },
  { name: "Salads", description: "Fresh and light salads" },
  { name: "Soups", description: "Warm and comforting soups" },
];

const recipes = [
  {
    title: "Fluffy Pancakes",
    description:
      "Light and fluffy pancakes served with maple syrup and fresh berries.",
    categoryName: "Breakfast",
    imageSeed: "pancakes",
    preparationTime: 10,
    cookingTime: 15,
    difficulty: "easy",
    servings: 4,
    dietType: "vegetarian",
    allergens: "Gluten, Eggs, Dairy",
    chefTips:
      "Let the batter rest for 5 minutes before cooking for extra fluffiness.",
    ingredients: [
      { name: "Flour", quantity: 2, unit: "cups" },
      { name: "Milk", quantity: 1.5, unit: "cups" },
      { name: "Eggs", quantity: 2, unit: "pcs" },
      { name: "Sugar", quantity: 2, unit: "tbsp" },
      { name: "Baking powder", quantity: 1, unit: "tbsp" },
    ],
    steps: [
      "Mix the dry ingredients together in a large bowl.",
      "Whisk in the milk and eggs until smooth.",
      "Heat a non-stick pan over medium heat and pour in the batter.",
      "Cook until bubbles form on top, then flip and cook the other side.",
    ],
  },
  {
    title: "Grilled Chicken Salad",
    description:
      "A fresh salad with grilled chicken breast, mixed greens and a light vinaigrette.",
    categoryName: "Salads",
    imageSeed: "chicken-salad",
    preparationTime: 15,
    cookingTime: 12,
    difficulty: "easy",
    servings: 2,
    dietType: "meat",
    allergens: null,
    chefTips: "Let the chicken rest for a few minutes before slicing.",
    ingredients: [
      { name: "Chicken breast", quantity: 2, unit: "pcs" },
      { name: "Mixed greens", quantity: 4, unit: "cups" },
      { name: "Cherry tomatoes", quantity: 1, unit: "cup" },
      { name: "Olive oil", quantity: 3, unit: "tbsp" },
      { name: "Lemon juice", quantity: 1, unit: "tbsp" },
    ],
    steps: [
      "Season the chicken breasts with salt and pepper.",
      "Grill the chicken for about 6 minutes per side until fully cooked.",
      "Slice the chicken and toss with the greens and tomatoes.",
      "Drizzle with olive oil and lemon juice before serving.",
    ],
  },
  {
    title: "Classic Beef Lasagna",
    description:
      "Layers of pasta, rich beef ragu and creamy bechamel, baked to golden perfection.",
    categoryName: "Main Course",
    imageSeed: "lasagna",
    preparationTime: 30,
    cookingTime: 45,
    difficulty: "hard",
    servings: 6,
    dietType: "meat",
    allergens: "Gluten, Dairy",
    chefTips: "Let the lasagna rest for 10 minutes before slicing.",
    ingredients: [
      { name: "Lasagna sheets", quantity: 12, unit: "pcs" },
      { name: "Ground beef", quantity: 500, unit: "g" },
      { name: "Tomato sauce", quantity: 2, unit: "cups" },
      { name: "Bechamel sauce", quantity: 2, unit: "cups" },
      { name: "Mozzarella cheese", quantity: 200, unit: "g" },
    ],
    steps: [
      "Cook the ground beef with the tomato sauce until thickened.",
      "Spread a layer of meat sauce in a baking dish, then a layer of pasta sheets.",
      "Repeat the layers, finishing with bechamel sauce and mozzarella on top.",
      "Bake at 180°C for about 40 minutes until golden and bubbling.",
    ],
  },
  {
    title: "Chocolate Lava Cake",
    description:
      "A decadent chocolate cake with a warm, molten center.",
    categoryName: "Dessert",
    imageSeed: "lava-cake",
    preparationTime: 15,
    cookingTime: 12,
    difficulty: "medium",
    servings: 4,
    dietType: "vegetarian",
    allergens: "Gluten, Eggs, Dairy",
    chefTips: "Do not overbake - the center should stay soft and gooey.",
    ingredients: [
      { name: "Dark chocolate", quantity: 200, unit: "g" },
      { name: "Butter", quantity: 100, unit: "g" },
      { name: "Eggs", quantity: 3, unit: "pcs" },
      { name: "Sugar", quantity: 0.5, unit: "cup" },
      { name: "Flour", quantity: 0.3, unit: "cup" },
    ],
    steps: [
      "Melt the chocolate and butter together until smooth.",
      "Whisk in the eggs and sugar, then fold in the flour.",
      "Pour the batter into greased ramekins.",
      "Bake at 200°C for 10-12 minutes and serve immediately.",
    ],
  },
  {
    title: "Tomato Basil Soup",
    description:
      "A comforting, creamy tomato soup with fresh basil.",
    categoryName: "Soups",
    imageSeed: "tomato-soup",
    preparationTime: 10,
    cookingTime: 25,
    difficulty: "easy",
    servings: 4,
    dietType: "vegan",
    allergens: null,
    chefTips: "Blend the soup well for an extra smooth texture.",
    ingredients: [
      { name: "Tomatoes", quantity: 1, unit: "kg" },
      { name: "Onion", quantity: 1, unit: "pcs" },
      { name: "Garlic", quantity: 3, unit: "cloves" },
      { name: "Vegetable broth", quantity: 2, unit: "cups" },
      { name: "Fresh basil", quantity: 0.5, unit: "cup" },
    ],
    steps: [
      "Saute the onion and garlic until soft.",
      "Add the tomatoes and vegetable broth, then simmer for 20 minutes.",
      "Blend the soup until smooth.",
      "Stir in the fresh basil before serving.",
    ],
  },
];

/*
Creates the categories if they do not already exist,
and returns a name-to-id lookup map.
*/
const seedCategories = async () => {
  const categoryIds = {};

  for (const category of categories) {
    await pool.execute(
      `
        INSERT INTO categories (name, description, is_active)
        VALUES (?, ?, TRUE)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `,
      [category.name, category.description]
    );

    const [rows] = await pool.execute(
      `SELECT id FROM categories WHERE name = ? LIMIT 1`,
      [category.name]
    );

    categoryIds[category.name] = rows[0].id;
  }

  return categoryIds;
};

/*
Finds the chef created by the seedTestUsers script.
*/
const getChefId = async () => {
  const [rows] = await pool.execute(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [CHEF_EMAIL]
  );

  if (!rows[0]) {
    throw new Error(
      `No chef account found for ${CHEF_EMAIL}. Run "npm run seed:test-users" first.`
    );
  }

  return rows[0].id;
};

/*
Creates one recipe with its ingredients and steps
inside a single transaction.
*/
const createRecipe = async (recipe, chefId, categoryId) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
        INSERT INTO recipes (
          chef_id, category_id, title, description,
          image_url, image_public_id,
          preparation_time, cooking_time, difficulty,
          servings, diet_type, allergens, chef_tips
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        chefId,
        categoryId,
        recipe.title,
        recipe.description,
        `https://picsum.photos/seed/${recipe.imageSeed}/600/400`,
        `seed/${recipe.imageSeed}`,
        recipe.preparationTime,
        recipe.cookingTime,
        recipe.difficulty,
        recipe.servings,
        recipe.dietType,
        recipe.allergens,
        recipe.chefTips,
      ]
    );

    const recipeId = result.insertId;

    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ingredient = recipe.ingredients[i];

      await connection.execute(
        `
          INSERT INTO recipe_ingredients (
            recipe_id, ingredient_name, quantity, unit, position
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [recipeId, ingredient.name, ingredient.quantity, ingredient.unit, i + 1]
      );
    }

    for (let i = 0; i < recipe.steps.length; i++) {
      await connection.execute(
        `
          INSERT INTO recipe_steps (recipe_id, step_number, instruction)
          VALUES (?, ?, ?)
        `,
        [recipeId, i + 1, recipe.steps[i]]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const seedRecipes = async () => {
  try {
    const categoryIds = await seedCategories();
    const chefId = await getChefId();

    for (const recipe of recipes) {
      const [existing] = await pool.execute(
        `SELECT id FROM recipes WHERE title = ? AND chef_id = ? LIMIT 1`,
        [recipe.title, chefId]
      );

      if (existing.length > 0) {
        console.log(`Skipped (already exists): ${recipe.title}`);
        continue;
      }

      await createRecipe(recipe, chefId, categoryIds[recipe.categoryName]);
      console.log(`Created recipe: ${recipe.title}`);
    }

    console.log("Recipe seeding complete.");
  } catch (error) {
    console.error("Failed to seed recipes:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedRecipes();
