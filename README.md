# QDB - Quantum Database Backup

A CLI tool for creating post-quantum encrypted Supabase database backups that are automatically emailed to recipients.

## Features

- 🔐 **Post-Quantum Encryption**: Uses `@profullstack/post-quantum-helper` for quantum-resistant encryption
- 💾 **Automated Backups**: Seamlessly integrates with Supabase CLI to create database dumps
- 📧 **Email Delivery**: Automatically sends encrypted backups via email
- 🔒 **Secure Key Management**: You control your encryption keys - they're never stored or shared
- 📦 **Compressed Archives**: Creates ZIP archives before encryption for efficient storage
- 🧹 **Clean Workflow**: Automatically cleans up intermediate files

## Prerequisites

- Node.js 20 or newer
- Supabase CLI installed (`pnpm add -g supabase`)
- A Supabase project initialized in your directory
- SMTP credentials for email delivery

## Installation

### Option 1: Install Globally (Recommended)

```bash
# Install globally from npm (when published)
pnpm add -g @profullstack/quantum-database-backups

# Or install from local directory
cd quantum-database-backups
pnpm install
pnpm link --global

# Now you can use 'qdb' from anywhere
qdb --help
```

### Option 2: Local Development

```bash
# Clone the repository
git clone <repository-url>
cd quantum-database-backups

# Install dependencies
pnpm install

# Run locally with node
node src/cli.js --help
```

## Quick Start

### Interactive Setup (Recommended)

Run the interactive setup wizard to configure QDB:

```bash
qdb init
```

This will prompt you for:
- Path to encryption keys file
- Default recipient email
- Default database name
- Working directory for backups
- SMTP server settings (host, port, credentials)

Configuration is saved to `~/.config/quantum-database-backups/config.json` with secure permissions (0600).

### Manual Configuration

Alternatively, you can configure via environment variables:

```bash
export SMTP_USER="your-email@example.com"
export SMTP_PASS="your-app-password"
export SMTP_HOST="smtp.gmail.com"  # Optional
export SMTP_PORT="587"              # Optional
```

### Generate Encryption Keys

You need to generate your post-quantum encryption keys. Create a `keys.json` file:

```json
{
  "publicKey": "your-public-key-here",
  "privateKey": "your-private-key-here"
}
```

**⚠️ IMPORTANT**: Keep your `keys.json` file secure and backed up separately. Without it, you cannot decrypt your backups!

For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833).

## Usage

### Create an Encrypted Backup

```bash
qdb backup \
  --email recipient@example.com \
  --keys ./keys.json \
  --db-name mydb
```

#### Options

- `-e, --email <email>` - Recipient email address (required)
- `-k, --keys <path>` - Path to keys.json file (required)
- `-d, --db-name <name>` - Database name for filename (required)
- `-w, --work-dir <path>` - Working directory for backups (default: `./backups`)
- `--keep-files` - Keep intermediate SQL and ZIP files (default: false)
- `--no-email` - Skip sending email, only create encrypted backup

#### Example with Options

```bash
# Create backup and keep intermediate files
qdb backup \
  --email admin@example.com \
  --keys ./keys.json \
  --db-name production \
  --work-dir ./my-backups \
  --keep-files

# Create backup without sending email
qdb backup \
  --email admin@example.com \
  --keys ./keys.json \
  --db-name staging \
  --no-email
```

### Decrypt a Backup

```bash
qdb decrypt \
  --input ./backups/supabase-backup-20241006-123456-mydb.zip.encrypted \
  --output ./restored-backup.zip \
  --keys ./keys.json
```

#### Options

- `-i, --input <path>` - Path to encrypted file (required)
- `-o, --output <path>` - Path for decrypted output file (required)
- `-k, --keys <path>` - Path to keys.json file (required)

### View Configuration

```bash
qdb info
```

This displays your current configuration and available commands.

## Configuration Priority

QDB uses the following priority order for configuration:

1. **Command-line arguments** (highest priority)
2. **Saved configuration** (`~/.config/quantum-database-backups/config.json`)
3. **Environment variables**
4. **Default values** (lowest priority)

This allows you to:
- Set defaults with `qdb init`
- Override per-backup with CLI flags
- Use environment variables for sensitive data

## Workflow

The backup process follows these steps:

1. **Load Configuration**: Merges CLI args, saved config, and env vars
2. **Load Keys**: Reads your encryption keys from configured path
3. **Database Dump**: Executes `pnpx supabase db dump` to create SQL backup
4. **Create Archive**: Compresses the SQL file into a ZIP archive
5. **Encrypt**: Encrypts the ZIP file using post-quantum cryptography
6. **Email**: Sends the encrypted file to the specified recipient
7. **Cleanup**: Removes intermediate files (unless `--keep-files` is used)

## File Naming Convention

Backup files follow this naming pattern:

```
supabase-backup-{YYYYMMDD-HHMMSS}-{dbname}.{extension}
```

Example: `supabase-backup-20241006-143022-production.zip.encrypted`

## Security Best Practices

1. **Never commit keys.json**: Add it to `.gitignore`
2. **Store keys separately**: Keep backups of your keys in a secure location separate from your encrypted backups
3. **Use strong SMTP passwords**: Use app-specific passwords when available
4. **Rotate keys periodically**: Generate new keys and re-encrypt old backups
5. **Test decryption**: Regularly verify you can decrypt your backups

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage
```

### Linting and Formatting

```bash
# Check code style
pnpm run lint

# Format code
pnpm run format

# Check formatting without changes
pnpm run format:check
```

### Project Structure

```
quantum-database-backups/
├── src/
│   ├── cli.js          # CLI entry point
│   ├── backup.js       # Database backup logic
│   ├── encrypt.js      # Post-quantum encryption
│   ├── email.js        # Email functionality
│   └── utils.js        # Helper functions
├── tests/
│   └── utils.test.js   # Test files
├── .eslintrc.json      # ESLint configuration
├── .prettierrc.json    # Prettier configuration
├── package.json        # Project dependencies
└── README.md           # This file
```

## Troubleshooting

### "SMTP not configured" Error

Make sure you've set the `SMTP_USER` and `SMTP_PASS` environment variables:

```bash
export SMTP_USER="your-email@example.com"
export SMTP_PASS="your-password"
```

### "Database dump failed" Error

Ensure:
1. Supabase CLI is installed: `pnpm add -g supabase`
2. You're in a directory with a Supabase project
3. Your Supabase project is properly configured

### "Missing required keys" Error

Your `keys.json` file must contain both `publicKey` and `privateKey` fields:

```json
{
  "publicKey": "...",
  "privateKey": "..."
}
```

## License

MIT

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Keep commits focused and descriptive

## Support

For issues and questions, please open an issue on the GitHub repository.

## Copyright

© Profullstack, Inc. https://profullstck.com