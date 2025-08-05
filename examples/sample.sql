-- Sample SQL queries for testing SQL Optimizer

-- Simple query without WHERE clause (will trigger suggestions)
SELECT * FROM users;

-- Query with WHERE clause but no index
SELECT name, email FROM users WHERE email = 'user@example.com';

-- Query with JOIN
SELECT u.name, p.title 
FROM users u 
JOIN posts p ON u.id = p.user_id 
WHERE u.created_at > '2024-01-01';

-- Query with ORDER BY but no LIMIT
SELECT * FROM posts ORDER BY created_at DESC;

-- Complex query with multiple conditions
SELECT u.name, p.title, c.content
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN comments c ON p.id = c.post_id
WHERE u.status = 'active' 
  AND p.published = true
  AND c.created_at > '2024-01-01'
ORDER BY p.created_at DESC;

-- Query with GROUP BY
SELECT u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name
HAVING COUNT(p.id) > 5;

-- Query with subquery
SELECT name, email 
FROM users 
WHERE id IN (SELECT user_id FROM posts WHERE published = true);

-- Query with LIKE pattern
SELECT * FROM users WHERE name LIKE '%john%';

-- Query with functions on columns
SELECT * FROM users WHERE LOWER(email) = 'user@example.com'; 