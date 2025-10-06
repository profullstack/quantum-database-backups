import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * MongoDB database provider
 * Uses mongodump and mongorestore from MongoDB Database Tools
 */
export class MongoDBProvider {
  constructor() {
    this.name = 'mongodb';
    this.displayName = 'MongoDB';
  }

  /**
   * Check if the provider is available
   * @returns {Promise<boolean>} True if mongodump is available
   */
  async isAvailable() {
    try {
      await execAsync('mongodump --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a database dump
   * @param {string} outputPath - Path where dump archive should be saved
   * @param {Object} options - Provider-specific options
   * @param {string} options.uri - MongoDB connection URI
   * @param {string} options.database - Database name
   * @returns {Promise<void>}
   */
  async createDump(outputPath, options = {}) {
    try {
      const { uri, database } = options;
      
      if (!uri) {
        throw new Error('MongoDB URI is required');
      }

      // mongodump creates a directory, so we'll use --archive to create a single file
      const cmd = [
        'mongodump',
        `--uri="${uri}"`,
        database ? `--db="${database}"` : '',
        `--archive="${outputPath}"`,
        '--gzip',
      ]
        .filter(Boolean)
        .join(' ');

      const { stderr } = await execAsync(cmd, {
        maxBuffer: 50 * 1024 * 1024,
      });

      if (stderr && !stderr.includes('done')) {
        console.warn('MongoDB dump warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`MongoDB dump failed: ${error.message}`);
    }
  }

  /**
   * Get the file extension for dumps
   * @returns {string} File extension
   */
  getFileExtension() {
    return 'archive'; // mongodump with --archive creates .archive files
  }

  /**
   * Get provider-specific configuration prompts
   * @returns {Array} Array of inquirer prompt objects
   */
  getConfigPrompts() {
    return [
      {
        type: 'input',
        name: 'mongodbUri',
        message: 'MongoDB connection URI:',
        default: 'mongodb://localhost:27017',
      },
      {
        type: 'input',
        name: 'mongodbDatabase',
        message: 'MongoDB database name (optional):',
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
    if (config.mongodbUri && !config.mongodbUri.startsWith('mongodb://')) {
      errors.push('MongoDB URI must start with mongodb://');
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
   * @param {string} options.uri - MongoDB connection URI
   * @param {string} options.database - Database name
   * @param {boolean} options.drop - Drop existing collections before restore
   * @returns {Promise<void>}
   */
  async restoreFromDump(dumpPath, options = {}) {
    try {
      const { uri, database, drop = false } = options;

      if (!uri) {
        throw new Error('MongoDB URI is required for restore');
      }

      const cmd = [
        'mongorestore',
        `--uri="${uri}"`,
        database ? `--db="${database}"` : '',
        drop ? '--drop' : '',
        `--archive="${dumpPath}"`,
        '--gzip',
      ]
        .filter(Boolean)
        .join(' ');

      const { stderr } = await execAsync(cmd, {
        maxBuffer: 50 * 1024 * 1024,
      });

      if (stderr && !stderr.includes('done')) {
        console.warn('MongoDB restore warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`MongoDB restore failed: ${error.message}`);
    }
  }
}

// Export a singleton instance
export default new MongoDBProvider();