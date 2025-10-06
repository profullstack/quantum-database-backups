#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { createBackup } from './backup.js';
import {
  loadKeys,
  encryptBackupFile,
  decryptBackupFile,
  getFileSize,
  formatBytes,
} from './encrypt.js';
import {
  sendBackupEmail,
  generateBackupEmailContent,
  isSmtpConfigured,
} from './email.js';
import { deleteFile, getAbsolutePath } from './utils.js';
import {
  configExists,
  loadConfig,
  saveConfig,
  mergeConfig,
  validateConfig,
  getConfigPath,
} from './config.js';
import path from 'path';

const program = new Command();

program
  .name('qdb')
  .description('Quantum Database Backup - Post-quantum encrypted database backups')
  .version('1.0.0');

/**
 * Init command - Interactive setup wizard
 */
program
  .command('init')
  .description('Interactive setup wizard for QDB configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      console.log('🔐 QDB Configuration Setup\n');

      // Check if config already exists
      if ((await configExists()) && !options.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Configuration already exists. Overwrite?',
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log('Setup cancelled.');
          process.exit(0);
        }
      }

      // Interactive prompts
      const responses = await inquirer.prompt([
        {
          type: 'input',
          name: 'keysPath',
          message: 'Path to encryption keys file (keys.json):',
          default: './keys.json',
          validate: (value) =>
            value.trim() ? true : 'Keys path is required',
        },
        {
          type: 'input',
          name: 'defaultEmail',
          message: 'Default recipient email address:',
          validate: (value) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
              ? true
              : 'Valid email required',
        },
        {
          type: 'input',
          name: 'defaultDbName',
          message: 'Default database name:',
          validate: (value) =>
            value.trim() ? true : 'Database name is required',
        },
        {
          type: 'input',
          name: 'workDir',
          message: 'Working directory for backups:',
          default: './backups',
        },
        {
          type: 'input',
          name: 'smtpHost',
          message: 'SMTP server hostname:',
          default: 'smtp.gmail.com',
        },
        {
          type: 'number',
          name: 'smtpPort',
          message: 'SMTP server port:',
          default: 587,
        },
        {
          type: 'confirm',
          name: 'smtpSecure',
          message: 'Use TLS/SSL?',
          default: false,
        },
        {
          type: 'input',
          name: 'smtpUser',
          message: 'SMTP username (email):',
          validate: (value) => (value.trim() ? true : 'SMTP user is required'),
        },
        {
          type: 'password',
          name: 'smtpPass',
          message: 'SMTP password (app password recommended):',
          mask: '*',
          validate: (value) =>
            value.trim() ? true : 'SMTP password is required',
        },
      ]);

      // Build config object
      const config = {
        keysPath: responses.keysPath,
        defaultEmail: responses.defaultEmail,
        defaultDbName: responses.defaultDbName,
        workDir: responses.workDir,
        smtp: {
          host: responses.smtpHost,
          port: responses.smtpPort,
          secure: responses.smtpSecure,
          user: responses.smtpUser,
          pass: responses.smtpPass,
        },
      };

      // Validate config
      const validation = validateConfig(config);
      if (!validation.valid) {
        console.error('\n❌ Configuration validation failed:');
        validation.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }

      // Save config
      await saveConfig(config);

      console.log('\n✅ Configuration saved successfully!');
      console.log(`📁 Config location: ${getConfigPath()}`);
      console.log('\n💡 You can now run backups without specifying options:');
      console.log('   qdb backup');
      console.log('\n💡 Or override specific values:');
      console.log('   qdb backup --email other@example.com --db-name staging');
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Backup command - Create encrypted database backup and email it
 */
program
  .command('backup')
  .description('Create an encrypted database backup and email it')
  .option('-e, --email <email>', 'Recipient email address')
  .option('-k, --keys <path>', 'Path to keys.json file')
  .option('-d, --db-name <name>', 'Database name')
  .option('-w, --work-dir <path>', 'Working directory for backups')
  .option('--keep-files', 'Keep intermediate files (SQL and ZIP)', false)
  .option('--no-email', 'Skip sending email (only create encrypted backup)')
  .action(async (options) => {
    try {
      console.log('🔐 Starting quantum database backup...\n');

      // Merge config with CLI options
      const config = await mergeConfig(options);

      // Check if we have required values
      if (!config.keys) {
        throw new Error(
          'Keys path not specified. Run "qdb init" or use --keys option.'
        );
      }
      if (!config.email && !options.noEmail) {
        throw new Error(
          'Email not specified. Run "qdb init" or use --email option.'
        );
      }
      if (!config.dbName) {
        throw new Error(
          'Database name not specified. Run "qdb init" or use --db-name option.'
        );
      }

      // Validate SMTP configuration if email is enabled
      if (config.email && !options.noEmail) {
        if (!config.smtp.user || !config.smtp.pass) {
          throw new Error(
            'SMTP not configured. Run "qdb init" or set SMTP_USER and SMTP_PASS environment variables.'
          );
        }
      }

      // Load encryption keys
      console.log('📋 Loading encryption keys...');
      const keysPath = getAbsolutePath(config.keys);
      const keys = await loadKeys(keysPath);
      console.log('✓ Keys loaded successfully\n');

      // Create database backup (dump + ZIP)
      console.log('💾 Creating database backup...');
      const { dumpFile, zipFile } = await createBackup(
        config.dbName,
        config.workDir
      );
      console.log(`✓ Database dump created: ${path.basename(dumpFile)}`);
      console.log(`✓ ZIP archive created: ${path.basename(zipFile)}\n`);

      // Encrypt the ZIP file
      console.log('🔒 Encrypting backup with post-quantum cryptography...');
      const encryptedFile = `${zipFile}.encrypted`;
      await encryptBackupFile(zipFile, encryptedFile, keys);

      const fileSize = await getFileSize(encryptedFile);
      console.log(`✓ Backup encrypted: ${path.basename(encryptedFile)}`);
      console.log(`✓ File size: ${formatBytes(fileSize)}\n`);

      // Send email if enabled
      if (config.email && !options.noEmail) {
        console.log(`📧 Sending encrypted backup to ${config.email}...`);
        const { subject, text } = generateBackupEmailContent(
          config.dbName,
          path.basename(encryptedFile),
          formatBytes(fileSize)
        );

        // Set SMTP env vars from config if not already set
        if (!process.env.SMTP_USER) process.env.SMTP_USER = config.smtp.user;
        if (!process.env.SMTP_PASS) process.env.SMTP_PASS = config.smtp.pass;
        if (!process.env.SMTP_HOST) process.env.SMTP_HOST = config.smtp.host;
        if (!process.env.SMTP_PORT)
          process.env.SMTP_PORT = String(config.smtp.port);
        if (!process.env.SMTP_SECURE)
          process.env.SMTP_SECURE = String(config.smtp.secure);

        await sendBackupEmail({
          to: config.email,
          subject,
          text,
          attachmentPath: encryptedFile,
        });
        console.log('✓ Email sent successfully\n');
      }

      // Clean up intermediate files if requested
      if (!options.keepFiles) {
        console.log('🧹 Cleaning up intermediate files...');
        await deleteFile(dumpFile);
        await deleteFile(zipFile);
        console.log('✓ Cleanup complete\n');
      }

      console.log('✅ Backup process completed successfully!');
      console.log(`📦 Encrypted backup: ${encryptedFile}`);

      if (!options.keepFiles) {
        console.log('\n⚠️  IMPORTANT: Keep your keys.json file safe!');
        console.log('   Without it, you cannot decrypt this backup.');
      }

      // Show config location if using saved config
      if (await configExists()) {
        console.log(`\n📁 Using config from: ${getConfigPath()}`);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Decrypt command - Decrypt an encrypted backup file
 */
program
  .command('decrypt')
  .description('Decrypt an encrypted backup file')
  .requiredOption('-i, --input <path>', 'Path to encrypted file')
  .requiredOption('-o, --output <path>', 'Path for decrypted output file')
  .requiredOption('-k, --keys <path>', 'Path to keys.json file')
  .action(async (options) => {
    try {
      console.log('🔓 Starting decryption...\n');

      // Load encryption keys
      console.log('📋 Loading encryption keys...');
      const keysPath = getAbsolutePath(options.keys);
      const keys = await loadKeys(keysPath);
      console.log('✓ Keys loaded successfully\n');

      // Decrypt the file
      console.log('🔒 Decrypting backup...');
      const inputPath = getAbsolutePath(options.input);
      const outputPath = getAbsolutePath(options.output);

      await decryptBackupFile(inputPath, outputPath, keys);
/**
 * Restore command - Decrypt and restore an encrypted backup to database
 */
program
  .command('restore')
  .description('Decrypt and restore an encrypted backup to database')
  .requiredOption('-i, --input <path>', 'Path to encrypted backup file')
  .requiredOption('-k, --keys <path>', 'Path to keys.json file')
  .option(
    '-p, --provider <name>',
    'Database provider (supabase, mongodb, mysql, postgres)',
    'supabase'
  )
  .option('--host <host>', 'Database host')
  .option('--port <port>', 'Database port')
  .option('--user <user>', 'Database user')
  .option('--password <password>', 'Database password')
  .option('--database <name>', 'Database name')
  .option('--uri <uri>', 'Database connection URI (MongoDB)')
  .option('--drop', 'Drop existing data before restore (MongoDB/PostgreSQL)')
  .option('--clean', 'Clean database before restore (PostgreSQL)')
  .action(async (options) => {
    try {
      console.log('🔄 Starting database restore...\n');

      // Load encryption keys
      console.log('📋 Loading encryption keys...');
      const keysPath = getAbsolutePath(options.keys);
      const keys = await loadKeys(keysPath);
      console.log('✓ Keys loaded successfully\n');

      // Prepare provider options
      const providerOptions = {
        host: options.host,
        port: options.port ? parseInt(options.port, 10) : undefined,
        user: options.user,
        password: options.password,
        database: options.database,
        uri: options.uri,
        drop: options.drop || false,
        clean: options.clean || false,
      };

      // Remove undefined values
      Object.keys(providerOptions).forEach((key) => {
        if (providerOptions[key] === undefined) {
          delete providerOptions[key];
        }
      });

      // Import restore module
      const { restoreFromBackup } = await import('./restore.js');

      // Restore the backup
      const inputPath = getAbsolutePath(options.input);
      await restoreFromBackup(
        inputPath,
        keys,
        options.provider,
        providerOptions
      );

      console.log('✅ Restore completed successfully!');
      console.log(
        `📦 Database restored from: ${path.basename(options.input)}`
      );
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });


      const fileSize = await getFileSize(outputPath);
      console.log(`✓ File decrypted: ${path.basename(outputPath)}`);
      console.log(`✓ File size: ${formatBytes(fileSize)}\n`);

      console.log('✅ Decryption completed successfully!');
      console.log(`📦 Decrypted file: ${outputPath}`);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Info command - Display configuration and status
 */
program
  .command('info')
  .description('Display configuration and status information')
  .action(async () => {
    console.log('🔐 QDB - Quantum Database Backup\n');

    // Check for saved config
    const hasConfig = await configExists();
    console.log(`Saved Configuration: ${hasConfig ? '✓ Yes' : '✗ No'}`);

    if (hasConfig) {
      try {
        const config = await loadConfig();
        console.log(`  Config Location: ${getConfigPath()}`);
        console.log(`  Default Email: ${config.defaultEmail || '(not set)'}`);
        console.log(`  Default DB Name: ${config.defaultDbName || '(not set)'}`);
        console.log(`  Keys Path: ${config.keysPath || '(not set)'}`);
        console.log(`  Work Directory: ${config.workDir || './backups'}`);
        console.log(`  SMTP Host: ${config.smtp?.host || 'smtp.gmail.com'}`);
        console.log(`  SMTP Port: ${config.smtp?.port || '587'}`);
        console.log(`  SMTP User: ${config.smtp?.user || '(not set)'}`);
      } catch (error) {
        console.log(`  Error loading config: ${error.message}`);
      }
    } else {
      console.log('  Run "qdb init" to create configuration');
    }

    console.log('\nEnvironment Variables:');
    console.log(`  SMTP Configured: ${isSmtpConfigured() ? '✓ Yes' : '✗ No'}`);
    console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || '(not set)'}`);
    console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || '(not set)'}`);
    console.log(`  SMTP_USER: ${process.env.SMTP_USER || '(not set)'}`);

    console.log('\nUsage:');
    console.log('  qdb init                    # Interactive setup wizard');
    console.log('  qdb backup                  # Use saved configuration');
    console.log('  qdb backup --email user@example.com --db-name mydb');
    console.log('  qdb decrypt --input backup.encrypted --output backup.zip --keys ./keys.json');
    console.log('  qdb info                    # Show this information');
  });

program.parse();