-- Complex SQL queries for advanced testing

-- Query with multiple JOINs and complex WHERE conditions
SELECT 
    u.name,
    u.email,
    p.title,
    p.content,
    COUNT(c.id) as comment_count,
    AVG(c.rating) as avg_rating
FROM users u
INNER JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE u.status = 'active'
    AND p.published = true
    AND p.created_at >= '2024-01-01'
    AND (c.rating IS NULL OR c.rating >= 3)
GROUP BY u.id, u.name, u.email, p.id, p.title, p.content
HAVING COUNT(c.id) > 0
ORDER BY p.created_at DESC, avg_rating DESC
LIMIT 100;

-- Query with window functions
SELECT 
    u.name,
    p.title,
    p.created_at,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY p.created_at DESC) as post_rank,
    COUNT(*) OVER (PARTITION BY u.id) as total_posts
FROM users u
JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active'
ORDER BY u.name, p.created_at DESC;

-- Query with CTE (Common Table Expression)
WITH user_stats AS (
    SELECT 
        user_id,
        COUNT(*) as post_count,
        AVG(rating) as avg_rating
    FROM posts
    WHERE published = true
    GROUP BY user_id
    HAVING COUNT(*) > 5
),
top_users AS (
    SELECT 
        us.user_id,
        u.name,
        us.post_count,
        us.avg_rating
    FROM user_stats us
    JOIN users u ON us.user_id = u.id
    WHERE us.avg_rating >= 4.0
)
SELECT 
    tu.name,
    tu.post_count,
    tu.avg_rating,
    COUNT(c.id) as recent_comments
FROM top_users tu
LEFT JOIN posts p ON tu.user_id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tu.user_id, tu.name, tu.post_count, tu.avg_rating
ORDER BY tu.avg_rating DESC, tu.post_count DESC;

-- Query with EXISTS subquery
SELECT u.name, u.email
FROM users u
WHERE EXISTS (
    SELECT 1 
    FROM posts p 
    WHERE p.user_id = u.id 
        AND p.published = true 
        AND p.created_at >= '2024-01-01'
)
AND u.status = 'active';

-- Query with UNION
SELECT 'active' as status, COUNT(*) as count
FROM users 
WHERE status = 'active'
UNION ALL
SELECT 'inactive' as status, COUNT(*) as count
FROM users 
WHERE status = 'inactive'
UNION ALL
SELECT 'pending' as status, COUNT(*) as count
FROM users 
WHERE status = 'pending';

-- Query with CASE statement
SELECT 
    u.name,
    CASE 
        WHEN COUNT(p.id) = 0 THEN 'No posts'
        WHEN COUNT(p.id) < 5 THEN 'Few posts'
        WHEN COUNT(p.id) < 20 THEN 'Regular poster'
        ELSE 'Power user'
    END as user_type,
    COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id AND p.published = true
GROUP BY u.id, u.name
ORDER BY post_count DESC;

-- Query with date functions
SELECT 
    DATE_TRUNC('month', p.created_at) as month,
    COUNT(*) as posts_count,
    COUNT(DISTINCT p.user_id) as unique_authors
FROM posts p
WHERE p.published = true
    AND p.created_at >= '2024-01-01'
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month;

-- Query with JSON functions (PostgreSQL specific)
SELECT 
    u.name,
    u.email,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'id', p.id,
            'title', p.title,
            'created_at', p.created_at
        )
    ) as posts
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.email
HAVING COUNT(p.id) > 0; 