@echo off
echo Exporting database to SQL file...
pg_dump -U postgres -d italianenclaves -f neon-export.sql --no-owner --no-privileges
echo Done! File created: neon-export.sql
