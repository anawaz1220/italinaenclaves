@echo off
echo Importing database to Neon...
echo.

psql "postgresql://neondb_owner:npg_A3UscPLtE8Yl@ep-summer-moon-aioehezs-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require" -f neon-export.sql

echo.
echo Done! Verifying...
psql "postgresql://neondb_owner:npg_A3UscPLtE8Yl@ep-summer-moon-aioehezs-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require" -c "SELECT COUNT(*) as total_churches, COUNT(*) FILTER (WHERE enrichment_status = 'enriched') as enriched FROM churches;"
