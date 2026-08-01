-- =====================================================
-- RecipeHub Database
-- Full-Stack Final Project
-- =====================================================

DROP DATABASE IF EXISTS recipehub;

CREATE DATABASE recipehub
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE recipehub;

-- =====================================================
-- Users
-- =====================================================

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    role ENUM('user', 'chef', 'admin')
        NOT NULL DEFAULT 'user',

    profile_image_url VARCHAR(500) NULL,
    profile_image_public_id VARCHAR(255) NULL,

    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- =====================================================
-- Chef Requests
-- =====================================================

CREATE TABLE chef_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT UNSIGNED NOT NULL,

    display_name VARCHAR(100) NOT NULL,
    bio TEXT NOT NULL,
    experience TEXT NOT NULL,
    specialties VARCHAR(500) NOT NULL,

    status ENUM('pending', 'approved', 'rejected')
        NOT NULL DEFAULT 'pending',

    rejection_reason VARCHAR(500) NULL,

    reviewed_by INT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_chef_requests_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chef_requests_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- =====================================================
-- Chef Profiles
-- =====================================================

CREATE TABLE chef_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT UNSIGNED NOT NULL,

    display_name VARCHAR(100) NOT NULL,
    bio TEXT NOT NULL,
    experience TEXT NOT NULL,
    specialties VARCHAR(500) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_chef_profiles_user UNIQUE (user_id),

    CONSTRAINT fk_chef_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================================================
-- Categories
-- =====================================================

CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_categories_name UNIQUE (name)
);

-- =====================================================
-- Recipes
-- =====================================================

CREATE TABLE recipes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    chef_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,

    image_url VARCHAR(500) NOT NULL,
    image_public_id VARCHAR(255) NOT NULL,

    preparation_time INT UNSIGNED NOT NULL,
    cooking_time INT UNSIGNED NOT NULL,

    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,

    servings INT UNSIGNED NOT NULL,

    diet_type ENUM(
        'meat',
        'dairy',
        'parve',
        'vegan',
        'vegetarian',
        'other'
    ) NOT NULL,

    allergens VARCHAR(500) NULL,
    chef_tips TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_recipes_chef
        FOREIGN KEY (chef_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_recipes_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_recipes_preparation_time
        CHECK (preparation_time > 0),

    CONSTRAINT chk_recipes_cooking_time
        CHECK (cooking_time >= 0),

    CONSTRAINT chk_recipes_servings
        CHECK (servings > 0)
);

-- =====================================================
-- Recipe Ingredients
-- =====================================================

CREATE TABLE recipe_ingredients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    recipe_id INT UNSIGNED NOT NULL,

    ingredient_name VARCHAR(150) NOT NULL,
    quantity DECIMAL(10, 2) NULL,
    unit VARCHAR(50) NULL,

    position INT UNSIGNED NOT NULL,

    CONSTRAINT fk_recipe_ingredients_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_recipe_ingredient_position
        UNIQUE (recipe_id, position),

    CONSTRAINT chk_recipe_ingredients_position
        CHECK (position > 0),

    CONSTRAINT chk_recipe_ingredients_quantity
        CHECK (quantity IS NULL OR quantity > 0)
);

-- =====================================================
-- Recipe Steps
-- =====================================================

CREATE TABLE recipe_steps (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    recipe_id INT UNSIGNED NOT NULL,

    step_number INT UNSIGNED NOT NULL,
    instruction TEXT NOT NULL,

    CONSTRAINT fk_recipe_steps_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_recipe_step_number
        UNIQUE (recipe_id, step_number),

    CONSTRAINT chk_recipe_steps_number
        CHECK (step_number > 0)
);

-- =====================================================
-- User Folders
-- =====================================================

CREATE TABLE folders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_folders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_folders_user_name
        UNIQUE (user_id, name)
);

-- =====================================================
-- Saved Recipes
-- =====================================================

CREATE TABLE saved_recipes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT UNSIGNED NOT NULL,
    recipe_id INT UNSIGNED NOT NULL,
    folder_id INT UNSIGNED NULL,

    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_saved_recipes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_saved_recipes_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_saved_recipes_folder
        FOREIGN KEY (folder_id)
        REFERENCES folders(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_saved_recipe
        UNIQUE (user_id, recipe_id)
);


-- =====================================================
-- Questions
-- =====================================================

CREATE TABLE questions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    recipe_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,

    question_text TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_questions_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_questions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================================================
-- Answers
-- =====================================================

CREATE TABLE answers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    question_id INT UNSIGNED NOT NULL,
    chef_id INT UNSIGNED NOT NULL,

    answer_text TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_answers_question UNIQUE (question_id),

    CONSTRAINT fk_answers_question
        FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_answers_chef
        FOREIGN KEY (chef_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================================================
-- Reviews
-- =====================================================

CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    recipe_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,

    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NOT NULL,

    image_url VARCHAR(500) NULL,
    image_public_id VARCHAR(255) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_reviews_user_recipe
        UNIQUE (user_id, recipe_id),

    CONSTRAINT chk_reviews_rating
        CHECK (rating BETWEEN 1 AND 5)
);

-- =====================================================
-- Notifications
-- =====================================================

CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT UNSIGNED NOT NULL,

    type ENUM(
        'new_question',
        'new_answer',
        'new_review',
        'new_follower',
        'new_recipe',
        'chef_request_approved',
        'chef_request_rejected',
        'admin_message'
    ) NOT NULL,

    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,

    related_entity_type VARCHAR(50) NULL,
    related_entity_id INT UNSIGNED NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================================================
-- Useful Indexes
-- =====================================================

CREATE INDEX idx_recipes_chef
    ON recipes(chef_id);

CREATE INDEX idx_recipes_category
    ON recipes(category_id);

CREATE INDEX idx_recipes_title
    ON recipes(title);

CREATE INDEX idx_questions_recipe
    ON questions(recipe_id);

CREATE INDEX idx_reviews_recipe
    ON reviews(recipe_id);

CREATE INDEX idx_notifications_user_read
    ON notifications(user_id, is_read);

CREATE INDEX idx_chef_requests_status
    ON chef_requests(status);

CREATE INDEX idx_reports_status
    ON reports(status);