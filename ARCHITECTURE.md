# Architecture Document

## How to scale to 100,000 users

1. Replace SQLite with PostgreSQL on AWS RDS or Render
2. Add Redis for caching layer (sub-millisecond lookups)
3. Use connection pooling (PgBouncer) for database
4. Split into microservices:
   - Journal Service (horizontal scaling)
   - Analysis Service (queue-based LLM processing)
   - Insights Service (read replicas)
5. Add load balancer (Nginx/CloudFlare) with multiple backend instances
6. Database sharding by user_id hash for entries table

## How to reduce LLM cost

1. Cache analysis results using MD5 hash of text (60-80% cache hit)
2. Implement tiered analysis:
   - Simple entries (&lt;100 chars): rule-based analysis (free)
   - Complex entries: LLM API call (paid)
3. Use local LLM (Llama 2 7B) as primary, OpenRouter as fallback
4. Batch multiple analysis requests into single API call
5. Current: DeepSeek free tier via OpenRouter with SQLite cache

## How to cache repeated analysis

1. SQLite table: analysis_cache(text_hash, emotion, keywords, summary, created_at)
2. MD5 hash of input text as cache key
3. Check cache before calling LLM
4. Permanent cache until manual clear
5. Future: Redis with TTL + semantic similarity (vector embeddings)

## How to protect sensitive journal data

1. Encryption at rest: AES-256 for journal text in database
2. Encryption in transit: HTTPS/TLS 1.3 only
3. Authentication: JWT tokens (Auth0/Clerk)
4. Authorization: Users can only access own user_id data
5. Input validation: Parameterized queries (prevents SQL injection)
6. Rate limiting: 10 entries per 15 minutes per user
7. Audit logging: Track all data access
8. GDPR compliance: Hard delete endpoint for user data removal