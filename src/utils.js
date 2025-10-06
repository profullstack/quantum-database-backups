import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generate a timestamp string in the format YYYYMMDD-HHMMSS
 * @returns {string} Formatted timestamp
 */
export function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Generate a backup filename with timestamp and database name
 * @param {string} dbName - Database name
 * @param {string} extension - File extension (default: 'sql')
 * @returns {string} Generated filename
 */
export function generateBackupFilename(dbName, extension = 'sql') {
  const timestamp = generateTimestamp();
  return `supabase-backup-${timestamp}-${dbName}.${extension}`;
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Delete a file if it exists
 * @param {string} filePath - Path to file to delete
 */
export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Read and parse a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} Parsed JSON object
 */
export async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Validate that required keys exist in an object
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredKeys - Array of required key names
 * @throws {Error} If any required keys are missing
 */
export function validateRequiredKeys(obj, requiredKeys) {
  const missingKeys = requiredKeys.filter((key) => !(key in obj));
  if (missingKeys.length > 0) {
    throw new Error(`Missing required keys: ${missingKeys.join(', ')}`);
  }
}

/**
 * Get the absolute path from a relative path
 * @param {string} relativePath - Relative path
 * @returns {string} Absolute path
 */
export function getAbsolutePath(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}