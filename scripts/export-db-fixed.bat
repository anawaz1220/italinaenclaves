@echo off
echo Exporting database with schema modifications...

echo Creating modified schema...
pg_dump -U postgres -d italianenclaves --schema-only --no-owner --no-privileges > neon-schema.sql

echo Exporting data only...
pg_dump -U postgres -d italianenclaves --data-only --no-owner --no-privileges > neon-data.sql

echo Done! Files created: neon-schema.sql and neon-data.sql
