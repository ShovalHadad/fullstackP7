const { pool } = require("../config/db");

/*
Returns only the category fields required by recipe filters
and recipe forms.

Inactive categories and internal timestamps are not returned.
*/
const findAllActive = async () => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name
      FROM categories
      WHERE is_active = TRUE
      ORDER BY name ASC
    `
  );

  return rows;
};

/*
Returns complete category information for administrators.

The administrator needs the description and active status
for category management.
*/
const findAll = async () => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM categories
      ORDER BY name ASC
    `
  );

  return rows;
};

/*
Finds a category by its ID.

This server-side function includes is_active because services
must verify whether the category is available.
*/
const findById = async (categoryId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?
      LIMIT 1
    `,
    [categoryId]
  );

  return rows[0] || null;
};

/*
Finds only the minimum data required to check
whether a category name already exists.
*/
const findByName = async (name) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        is_active
      FROM categories
      WHERE name = ?
      LIMIT 1
    `,
    [name]
  );

  return rows[0] || null;
};

/*
Creates a category and returns the values already known
without performing an additional SELECT query.
*/
const create = async ({ name, description }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO categories (
        name,
        description,
        is_active
      )
      VALUES (?, ?, TRUE)
    `,
    [name, description]
  );

  return {
    id: result.insertId,
    name,
    description,
    is_active: 1,
  };
};

/*
Updates a category.

The service already validated the existing category,
so this function returns the supplied updated values
without another database query.
*/
const update = async (
  categoryId,
  { name, description }
) => {
  await pool.execute(
    `
      UPDATE categories
      SET
        name = ?,
        description = ?
      WHERE id = ?
    `,
    [name, description, categoryId]
  );

  return {
    id: categoryId,
    name,
    description,
  };
};

/*
Changes the active state of a category without
performing a second SELECT query.
*/
const updateActiveStatus = async (
  categoryId,
  isActive
) => {
  await pool.execute(
    `
      UPDATE categories
      SET is_active = ?
      WHERE id = ?
    `,
    [isActive, categoryId]
  );

  return {
    id: categoryId,
    is_active: isActive ? 1 : 0,
  };
};

module.exports = {
  findAllActive,
  findAll,
  findById,
  findByName,
  create,
  update,
  updateActiveStatus,
};