const categoryService =
  require("../services/categoryService");

/*
Returns all active categories.

This route is public.
*/
const getActiveCategories = async (
  req,
  res,
  next
) => {
  try {
    const categories =
      await categoryService.getActiveCategories();

    res.status(200).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Returns all categories, including inactive ones.

This route is available only to administrators.
*/
const getAllCategories = async (
  req,
  res,
  next
) => {
  try {
    const categories =
      await categoryService.getAllCategories();

    res.status(200).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Creates a new category.
*/
const createCategory = async (
  req,
  res,
  next
) => {
  try {
    const category =
      await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates an existing category.
*/
const updateCategory = async (
  req,
  res,
  next
) => {
  try {
    const category =
      await categoryService.updateCategory(
        Number(req.params.categoryId),
        req.body
      );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Soft-deletes a category.
*/
const deactivateCategory = async (
  req,
  res,
  next
) => {
  try {
    const category =
      await categoryService.deactivateCategory(
        Number(req.params.categoryId)
      );

    res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Restores an inactive category.
*/
const activateCategory = async (
  req,
  res,
  next
) => {
  try {
    const category =
      await categoryService.activateCategory(
        Number(req.params.categoryId)
      );

    res.status(200).json({
      success: true,
      message: "Category activated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
};