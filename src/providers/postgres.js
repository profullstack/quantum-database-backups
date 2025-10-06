import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * PostgreSQL database provider
 * Uses pg_dump and pg_restore from PostgreSQL client tools
 */
export class PostgreSQLProvider {
  constructor() {
    this.name = 'postgres';
    this.displayName = 'PostgreSQL';
  }

  /**
   * Check if the provider is available
   * @returns {Promise<boolean>} True if pg_dump is available
   */
  async isAvailable() {
    try {
      await execAsync('pg_dump --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a database dump
   * @param {string} outputPath - Path where dump file should be saved
   * @param {Object} options - Provider-specific options
   * @param {string} options.host - PostgreSQL host
   * @param {number} options.port - PostgreSQL port
   * @param {string} options.user - PostgreSQL user
   * @param {string} options.password - PostgreSQL password
   * @param {string} options.database - Database name
   * @param {string} options.format - Dump format (custom, plain, directory, tar)
   * @returns {Promise<void>}
   */
  async createDump(outputPath, options = {}) {
    try {
      const {
        host = 'localhost',
        port = 5432,
        user,
        password,
        database,
        format = 'custom', // custom format is compressed and suitable for pg_restore
      } = options;

      if (!user || !database) {
        throw new Error('PostgreSQL user and database are required');
      }

      // Set PGPASSWORD environment variable for authentication
      const env = {
        ...process.env,
        ...(password && { PGPASSWORD: password }),
      };

      const cmd = [
        'pg_dump',
        `--host=${host}`,
        `--port=${port}`,
        `--username=${user}`,
        `--format=${format}`,
        '--verbose',
        '--no-owner',
        '--no-acl',
        `--file=${outputPath}`,
        database,
      ].join(' ');

      const { stderr } = await execAsync(cmd, {
        maxBuffer: 50 * 1024 * 1024,
        env,
      });

      if (stderr && !stderr.includes('pg_dump')) {
        console.warn('PostgreSQL dump warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`PostgreSQL dump failed: ${error.message}`);
    }
  }

  /**
   * Get the file extension for dumps
   * @returns {string} File extension
   */
  getFileExtension() {
    return 'dump'; // custom format uses .dump extension
  }

  /**
   * Get provider-specific configuration prompts
   * @returns {Array} Array of inquirer prompt objects
   */
  getConfigPrompts() {
    return [
      {
        type: 'input',
        name: 'postgresHost',
        message: 'PostgreSQL host:',
        default: 'localhost',
      },
      {
        type: 'number',
        name: 'postgresPort',
        message: 'PostgreSQL port:',
        default: 5432,
      },
      {
        type: 'input',
        name: 'postgresUser',
        message: 'PostgreSQL user:',
        default: 'postgres',
      },
      {
        type: 'password',
        name: 'postgresPassword',
        message: 'PostgreSQL password:',
        mask: '*',
      },
      {
        type: 'input',
        name: 'postgresDatabase',
        message: 'PostgreSQL database name:',
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
    if (!config.postgresUser) {
      errors.push('PostgreSQL user is required');
    }
    if (!config.postgresDatabase) {
      errors.push('PostgreSQL database is required');
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
   * @param {string} options.host - PostgreSQL host
   * @param {number} options.port - PostgreSQL port
   * @param {string} options.user - PostgreSQL user
   * @param {string} options.password - PostgreSQL password
   * @param {string} options.database - Database name
   * @param {boolean} options.clean - Drop database objects before recreating
   * @returns {Promise<void>}
   */
  async restoreFromDump(dumpPath, options = {}) {
    try {
      const {
        host = 'localhost',
        port = 5432,
        user,
        password,
        database,
        clean = false,
      } = options;

      if (!user || !database) {
        throw new Error(
          'PostgreSQL user and database are required for restore'
        );
      }

      // Set PGPASSWORD environment variable for authentication
      const env = {
        ...process.env,
        ...(password && { PGPASSWORD: password }),
      };

      const cmd = [
        'pg_restore',
        `--host=${host}`,
        `--port=${port}`,
        `--username=${user}`,
        `--dbname=${database}`,
        '--verbose',
        '--no-owner',
        '--no-acl',
        clean ? '--clean' : '',
        '--if-exists',
        dumpPath,
      ]
        .filter(Boolean)
        .join(' ');

      const { stderr } = await execAsync(cmd, {
        maxBuffer: 50 * 1024 * 1024,
        env,
      });

      if (stderr && !stderr.includes('pg_restore')) {
        console.warn('PostgreSQL restore warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`PostgreSQL restore failed: ${error.message}`);
    }
  }
}

// Export a singleton instance
export default new PostgreSQLProvider();