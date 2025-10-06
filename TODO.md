# QDB - Quantum Database Backup CLI

## Project Overview
A CLI tool for creating post-quantum encrypted Supabase database backups that are automatically emailed to recipients.

## Requirements

### Core Features
1. **Database Backup**: Use `pnpx supabase db dump` to create SQL backup
2. **Post-Quantum Encryption**: Use `@profullstack/post-quantum-helper` to encrypt backup
3. **File Management**: Create timestamped ZIP files with format `supabase-backup-{datetime}-{dbname}.zip`
4. **Email Delivery**: Send encrypted backup to recipient email
5. **Key Management**: User manages their own keys.json file (never stored/shared)

### Technical Stack
- Node.js 20+ with ESM modules
- `@profullstack/post-quantum-helper` for encryption
- `pnpx supabase` CLI for database operations
- Built-in Node.js modules (fs, child_process, path, etc.)
- Minimal external dependencies

### CLI Interface
```bash
qdb backup --email recipient@example.com --keys ./keys.json --db-name mydb
```

### Architecture

#### Modules
1. **src/cli.js** - CLI entry point with argument parsing
2. **src/backup.js** - Database backup operations
3. **src/encrypt.js** - Post-quantum encryption wrapper
4. **src/email.js** - Email sending functionality
5. **src/utils.js** - Helper functions (timestamps, file operations)

#### Workflow
1. Parse CLI arguments
2. Load encryption keys from keys.json
3. Execute `pnpx supabase db dump` to create SQL file
4. Create ZIP archive of SQL file
5. Encrypt ZIP file using post-quantum encryption
6. Email encrypted file to recipient
7. Clean up temporary files
8. Report success/failure

## Tasks

- [ ] Create TODO.md with project requirements and architecture
- [ ] Update package.json with dependencies and bin configuration
- [ ] Create src/cli.js as the main CLI entry point
- [ ] Create src/backup.js for database backup logic
- [ ] Create src/encrypt.js for post-quantum encryption
- [ ] Create src/email.js for email functionality
- [ ] Create src/utils.js for helper functions
- [ ] Create tests for all modules
- [ ] Add ESLint and Prettier configuration
- [ ] Create README.md with usage instructions
- [ ] Test the complete workflow

## Dependencies
- `@profullstack/post-quantum-helper` - Post-quantum encryption
- `commander` - CLI argument parsing
- `nodemailer` - Email sending
- `archiver` - ZIP file creation
- `mocha` + `chai` - Testing framework

## Security Considerations
- Keys are NEVER stored in the application
- User is responsible for managing keys.json
- Encrypted files use post-quantum algorithms
- Temporary files are cleaned up after operations