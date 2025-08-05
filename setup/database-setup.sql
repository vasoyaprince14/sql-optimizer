-- Database setup script for SQL Optimizer testing
-- This creates sample tables and data for demonstration

-- Drop existing tables if they exist
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);

-- Insert sample data
INSERT INTO users (name, email, status) VALUES 
('John Doe', 'john@example.com', 'active'),
('Jane Smith', 'jane@example.com', 'active'),
('Bob Johnson', 'bob@example.com', 'inactive'),
('Alice Brown', 'alice@example.com', 'active'),
('Charlie Wilson', 'charlie@example.com', 'active');

INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Books', 'Physical and digital books'),
('Clothing', 'Apparel and accessories'),
('Home & Garden', 'Home improvement and gardening supplies');

INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES
('Laptop Computer', 'High-performance laptop', 999.99, 1, 50),
('Smartphone', 'Latest model smartphone', 699.99, 1, 100),
('Programming Book', 'Learn advanced programming', 49.99, 2, 200),
('T-Shirt', 'Comfortable cotton t-shirt', 19.99, 3, 500),
('Garden Tools Set', 'Complete gardening toolkit', 89.99, 4, 75);

INSERT INTO posts (user_id, title, content, status) VALUES
(1, 'My First Post', 'This is my first blog post content.', 'published'),
(1, 'Tech Review', 'Review of the latest technology trends.', 'published'),
(2, 'Travel Adventures', 'My recent travel experiences.', 'published'),
(4, 'Cooking Tips', 'Some useful cooking tips and tricks.', 'published'),
(5, 'Draft Post', 'This is a draft post.', 'draft');

INSERT INTO comments (post_id, user_id, content) VALUES
(1, 2, 'Great first post!'),
(1, 4, 'Looking forward to more content.'),
(2, 3, 'Very informative tech review.'),
(3, 1, 'Love your travel stories!'),
(4, 2, 'These cooking tips are amazing!');

INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 1049.98, 'completed'),
(2, 699.99, 'completed'),
(4, 159.97, 'pending'),
(5, 89.99, 'processing');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 999.99, 999.99),
(1, 4, 2, 19.99, 39.98),
(1, 3, 1, 49.99, 49.99),
(2, 2, 1, 699.99, 699.99),
(3, 3, 2, 49.99, 99.98),
(3, 5, 1, 89.99, 89.99),
(4, 5, 1, 89.99, 89.99);

-- Create some indexes for testing
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Create a view for testing
CREATE VIEW user_post_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(p.id) as post_count,
    MAX(p.created_at) as last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email;

-- Update statistics
ANALYZE;

-- Display setup completion message
SELECT 'Database setup completed successfully!' as message;