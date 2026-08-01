const categoryModel = require("../models/categoryModel");
const AppError = require("./appError");

/*
Validates and normalizes category data.
*/
const validateCategoryData = ({ name, description }) => {
  if (!name || typeof name !== "string") {
    throw new AppError("Category name is required", 400);
  }

  const normalizedName = name.trim();

  if (normalizedName.length < 2) {
    throw new AppError(
      "Category name must contain at least 2 characters",
      400
    );
  }

  if (normalizedName.length > 100) {
    throw new AppError(
      "Category name cannot exceed 100 characters",
      400
    );
  }

  let normalizedDescription = null;

  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      throw new AppError(
        "Category description must be text",
        400
      );
    }

    normalizedDescription = description.trim() || null;

    if (
      normalizedDescription &&
      normalizedDescription.length > 500
    ) {
      throw new AppError(
        "Category description cannot exceed 500 characters",
        400
      );
    }
  }

  return {
    name: normalizedName,
    description: normalizedDescription,
  };
};

/*
Returns the active categories available to all users.
*/
const getActiveCategories = async () => {
  return categoryModel.findAllActive();
};

/*
Returns all categories to the administrator.
*/
const getAllCategories = async () => {
  return categoryModel.findAll();
};

/*
Creates a new category.

Category names must be unique.
*/
const createCategory = async (categoryData) => {
  const validatedData =
    validateCategoryData(categoryData);

  const existingCategory =
    await categoryModel.findByName(validatedData.name);

  if (existingCategory) {
    throw new AppError(
      "A category with this name already exists",
      409
    );
  }

  return categoryModel.create(validatedData);
};

/*
Updates an existing category.

A category cannot be renamed to the name
of another existing category.
*/
const updateCategory = async (
  categoryId,
  categoryData
) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new AppError("Category ID is not valid", 400);
  }

  const category =
    await categoryModel.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const validatedData =
    validateCategoryData(categoryData);

  const categoryWithSameName =
    await categoryModel.findByName(
      validatedData.name
    );

  if (
    categoryWithSameName &&
    categoryWithSameName.id !== categoryId
  ) {
    throw new AppError(
      "A category with this name already exists",
      409
    );
  }

  return categoryModel.update(
    categoryId,
    validatedData
  );
};

/*
Soft-deletes a category by making it inactive.

The database row remains available so existing recipes
can continue referencing the category.
*/
const deactivateCategory = async (categoryId) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new AppError("Category ID is not valid", 400);
  }

  const category =
    await categoryModel.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (!category.is_active) {
    throw new AppError(
      "Category is already inactive",
      409
    );
  }

  return categoryModel.updateActiveStatus(
    categoryId,
    false
  );
};

/*
Restores an inactive category.
*/
const activateCategory = async (categoryId) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new AppError("Category ID is not valid", 400);
  }

  const category =
    await categoryModel.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category.is_active) {
    throw new AppError(
      "Category is already active",
      409
    );
  }

  return categoryModel.updateActiveStatus(
    categoryId,
    true
  );
};

module.exports = {
  getActiveCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
};