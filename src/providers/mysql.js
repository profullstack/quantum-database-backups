import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * MySQL database provider
 * Uses mysqldump and mysql CLI tools
 */
export class MySQLProvider {
  constructor() {
    this.name = 'mysql';
    this.displayName = 'MySQL';
  }

  /**
   * Check if the provider is available
   * @returns {Promise<boolean>} True if mysqldump is available
   */
  async isAvailable() {
    try {
      await execAsync('mysqldump --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a database dump
   * @param {string} outputPath - Path where dump file should be saved
   * @param {Object} options - Provider-specific options
   * @param {string} options.host - MySQL host
   * @param {number} options.port - MySQL port
   * @param {string} options.user - MySQL user
   * @param {string} options.password - MySQL password
   * @param {string} options.database - Database name
   * @returns {Promise<void>}
   */
  async createDump(outputPath, options = {}) {
    try {
      const {
        host = 'localhost',
        port = 3306,
        user,
        password,
        database,
      } = options;

      if (!user || !database) {
        throw new Error('MySQL user and database are required');
      }

      const cmd = [
        'mysqldump',
        `--host=${host}`,
        `--port=${port}`,
        `--user=${user}`,
        password ? `--password=${password}` : '',
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        `--result-file=${outputPath}`,
        database,
      ]
        .filter(Boolean)
        .join(' ');

      const { stderr } = await execAsync(cmd, {
        maxBuffer: 50 * 1024 * 1024,
      });

      if (stderr && !stderr.includes('Warning')) {
        console.warn('MySQL dump warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`MySQL dump failed: ${error.message}`);
    }
  }

  /**
   * Get the file extension for dumps
   * @returns {string} File extension
   */
  getFileExtension() {
    return 'sql';
  }

  /**
   * Get provider-specific configuration prompts
   * @returns {Array} Array of inquirer prompt objects
   */
  getConfigPrompts() {
    return [
      {
        type: 'input',
        name: 'mysqlHost',
        message: 'MySQL host:',
        default: 'localhost',
      },
      {
        type: 'number',
        name: 'mysqlPort',
        message: 'MySQL port:',
        default: 3306,
      },
      {
        type: 'input',
        name: 'mysqlUser',
        message: 'MySQL user:',
        default: 'root',
      },
      {
        type: 'password',
        name: 'mysqlPassword',
        message: 'MySQL password:',
        mask: '*',
      },
      {
        type: 'input',
        name: 'mysqlDatabase',
        message: 'MySQL database name:',
      },
    ];
  }

  /**
   * Validate provider-specific configuration
   * @param {Object} config - Configuration object
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];
    if (!config.mysqlUser) {
      errors.push('MySQL user is required');
    }
    if (!config.mysqlDatabase) {
      errors.push('MySQL database is required');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Restore a database from a dump file
   * @param {string} dumpPath - Path to the dump file
   * @param {Object} options - Provider-specific options
   * @param {string} options.host - MySQL host
   * @param {number} options.port - MySQL port
   * @param {string} options.user - MySQL user
   * @param {string} options.password - MySQL password
   * @param {string} options.database - Database name
   * @returns {Promise<void>}
   */
  async restoreFromDump(dumpPath, options = {}) {
    try {
      const {
        host = 'localhost',
        port = 3306,
        user,
        password,
        database,
      } = options;

      if (!user || !database) {
        throw new Error('MySQL user and database are required for restore');
      }

      const cmd = [
        'mysql',
        `--host=${host}`,
        `--port=${port}`,
        `--user=${user}`,
        password ? `--password=${password}` : '',
        database,
        `< ${dumpPath}`,
      ]
        .filter(Boolean)
        .join(' ');

      const { stderr } = await execAsync(cmd, {
        maxBuffer: 50 * 1024 * 1024,
        shell: '/bin/bash', // Required for input redirection
      });

      if (stderr && !stderr.includes('Warning')) {
        console.warn('MySQL restore warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`MySQL restore failed: ${error.message}`);
    }
  }
}

// Export a singleton instance
export default new MySQLProvider();