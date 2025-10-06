import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Supabase database provider
 * Implements the database provider interface for Supabase
 */
export class SupabaseProvider {
  constructor() {
    this.name = 'supabase';
    this.displayName = 'Supabase';
  }

  /**
   * Check if the provider is available (CLI installed and project initialized)
   * @returns {Promise<boolean>} True if provider is available
   */
  async isAvailable() {
    try {
      await execAsync('pnpx supabase --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a database dump
   * @param {string} outputPath - Path where dump file should be saved
   * @param {Object} _options - Provider-specific options (unused for Supabase)
   * @returns {Promise<void>}
   */
  async createDump(outputPath, _options = {}) {
    try {
      const { stderr } = await execAsync(
        `pnpx supabase db dump -f ${outputPath}`,
        { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer for large databases
      );

      if (stderr && !stderr.includes('Dumping')) {
        console.warn('Database dump warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`Supabase dump failed: ${error.message}`);
    }
  }

  /**
   * Get the file extension for dumps from this provider
   * @returns {string} File extension (e.g., 'sql', 'bson')
   */
  getFileExtension() {
    return 'sql';
  }

  /**
   * Restore a database from a dump file
   * @param {string} dumpPath - Path to the dump file
   * @param {Object} _options - Provider-specific options (unused for Supabase)
   * @returns {Promise<void>}
   */
  async restoreFromDump(dumpPath, _options = {}) {
    try {
      const { stderr } = await execAsync(
        `pnpx supabase db reset --db-url file://${dumpPath}`,
        { maxBuffer: 50 * 1024 * 1024 }
      );

      if (stderr && !stderr.includes('Restoring')) {
        console.warn('Database restore warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`Supabase restore failed: ${error.message}`);
    }
  }

  /**
   * Get provider-specific configuration prompts for interactive setup
   * @returns {Array} Array of inquirer prompt objects
   */
  getConfigPrompts() {
    return [
      // Supabase doesn't need additional config beyond the standard ones
      // Could add project ref, API keys, etc. if needed
    ];
  }

  /**
   * Validate provider-specific configuration
   * @param {Object} _config - Configuration object (unused for Supabase)
   * @returns {Object} Validation result with { valid: boolean, errors: string[] }
   */
  validateConfig(_config) {
    const errors = [];
    // Add Supabase-specific validation if needed
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export a singleton instance
export default new SupabaseProvider();