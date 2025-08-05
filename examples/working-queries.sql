-- Working test queries for the SQL Optimizer
-- These queries work with the sample database schema

-- Simple query with potential optimizations
SELECT * FROM users WHERE email = 'john@example.com';

-- Query with JOIN and aggregation
SELECT 
    u.name,
    u.email,
    COUNT(p.id) as post_count,
    MAX(p.created_at) as last_post
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.email
HAVING COUNT(p.id) > 0;

-- Complex query with multiple JOINs
SELECT 
    u.name as user_name,
    p.title as post_title,
    COUNT(c.id) as comment_count
FROM users u
INNER JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.status = 'published'
GROUP BY u.id, u.name, p.id, p.title
ORDER BY comment_count DESC;

-- Query with subquery
SELECT 
    name,
    email,
    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as total_posts
FROM users u
WHERE status = 'active';

-- Expensive query without LIMIT
SELECT DISTINCT u.name, u.email
FROM users u
INNER JOIN posts p ON u.id = p.user_id
INNER JOIN comments c ON p.id = c.post_id
ORDER BY u.name;