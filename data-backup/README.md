# Database Backups

This folder contains PostgreSQL database backups for the Italian Enclaves project.

## Backup Files

### italianenclaves_backup_YYYY-MM-DD.dump
- **Format**: PostgreSQL custom format (compressed binary)
- **Use case**: Fast restoration, best for production
- **Restore command**:
  ```bash
  pg_restore -U postgres -d italianenclaves -c italianenclaves_backup_YYYY-MM-DD.dump
  ```

### italianenclaves_backup_YYYY-MM-DD.sql
- **Format**: Plain text SQL
- **Use case**: Human-readable, version control, manual inspection
- **Restore command**:
  ```bash
  psql -U postgres -d italianenclaves -f italianenclaves_backup_YYYY-MM-DD.sql
  ```

## Database Statistics (as of 2026-02-10)

- **Total churches**: 316
- **Successfully enriched**: 305 (96.5%)
- **Failed enrichment**: 11 (3.5%)
- **Database size**: ~50 KB (very lightweight)

## Restoration Steps

1. Create database (if not exists):
   ```bash
   createdb -U postgres italianenclaves
   ```

2. Restore from backup:
   ```bash
   # Option A: Custom format (recommended)
   pg_restore -U postgres -d italianenclaves -c italianenclaves_backup_2026-02-10.dump

   # Option B: SQL format
   psql -U postgres -d italianenclaves -f italianenclaves_backup_2026-02-10.sql
   ```

3. Verify restoration:
   ```bash
   psql -U postgres -d italianenclaves -c "SELECT COUNT(*) FROM churches;"
   ```

## Backup Schedule

For production, consider automated daily backups:
```bash
pg_dump -U postgres -d italianenclaves -F c -f backup_$(date +%Y%m%d).dump
```

## Notes

- Backups include full schema and all data
- Password may be required (default: postgres)
- Use `-c` flag to clean (drop) existing objects before restore
- For VPS deployment, store backups in secure location outside web root
