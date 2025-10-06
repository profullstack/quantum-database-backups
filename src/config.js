import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ensureDirectory, readJsonFile } from './utils.js';

/**
 * Get the config directory path
 * @returns {string} Config directory path
 */
export function getConfigDir() {
  return path.join(os.homedir(), '.config', 'quantum-database-backups');
}

/**
 * Get the config file path
 * @returns {string} Config file path
 */
export function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Check if config exists
 * @returns {Promise<boolean>} True if config exists
 */
export async function configExists() {
  try {
    await fs.access(getConfigPath());
    return true;
  } catch {
    return false;
  }
}

/**
 * Load configuration from file
 * @returns {Promise<Object>} Configuration object
 */
export async function loadConfig() {
  try {
    const configPath = getConfigPath();
    return await readJsonFile(configPath);
  } catch (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
}

/**
 * Save configuration to file
 * @param {Object} config - Configuration object
 */
export async function saveConfig(config) {
  try {
    const configDir = getConfigDir();
    const configPath = getConfigPath();

    await ensureDirectory(configDir);

    // Set restrictive permissions (0600 = rw-------)
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), {
      mode: 0o600,
    });

    console.log(`✓ Configuration saved to ${configPath}`);
  } catch (error) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

/**
 * Get configuration value with fallback
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} Configuration value
 */
export async function getConfigValue(key, defaultValue = null) {
  try {
    if (!(await configExists())) {
      return defaultValue;
    }
    const config = await loadConfig();
    return config[key] ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Merge configuration with command-line options
 * Priority: CLI args > config file > defaults
 * @param {Object} options - Command-line options
 * @returns {Promise<Object>} Merged configuration
 */
export async function mergeConfig(options) {
  const config = (await configExists()) ? await loadConfig() : {};

  return {
    email: options.email || config.defaultEmail || null,
    keys: options.keys || config.keysPath || null,
    dbName: options.dbName || config.defaultDbName || null,
    workDir: options.workDir || config.workDir || './backups',
    smtp: {
      host: process.env.SMTP_HOST || config.smtp?.host || 'smtp.gmail.com',
      port:
        parseInt(process.env.SMTP_PORT || config.smtp?.port || '587', 10) ||
        587,
      secure:
        process.env.SMTP_SECURE === 'true' || config.smtp?.secure || false,
      user: process.env.SMTP_USER || config.smtp?.user || null,
      pass: process.env.SMTP_PASS || config.smtp?.pass || null,
    },
  };
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];

  if (!config.keysPath) {
    errors.push('Keys path is required');
  }

  if (!config.defaultEmail) {
    errors.push('Default email is required');
  }

  if (!config.defaultDbName) {
    errors.push('Default database name is required');
  }

  if (!config.smtp?.user) {
    errors.push('SMTP user is required');
  }

  if (!config.smtp?.pass) {
    errors.push('SMTP password is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}