import { promises as fs } from 'fs';
import { readJsonFile, validateRequiredKeys } from './utils.js';

// Note: Import the actual functions from @profullstack/post-quantum-helper
// The exact API may vary - adjust imports based on the actual module exports
let encryptFile, decryptFile;
try {
  const pqHelper = await import('@profullstack/post-quantum-helper');
  encryptFile = pqHelper.encryptFile || pqHelper.encrypt || pqHelper.default?.encryptFile;
  decryptFile = pqHelper.decryptFile || pqHelper.decrypt || pqHelper.default?.decryptFile;
} catch (error) {
  console.warn('Warning: @profullstack/post-quantum-helper not properly loaded:', error.message);
}

/**
 * Load encryption keys from a JSON file
 * @param {string} keysPath - Path to keys.json file
 * @returns {Promise<Object>} Keys object
 */
export async function loadKeys(keysPath) {
  const keys = await readJsonFile(keysPath);

  // Validate that required keys exist
  validateRequiredKeys(keys, ['publicKey', 'privateKey']);

  return keys;
}

/**
 * Encrypt a file using post-quantum encryption
 * @param {string} inputFile - Path to file to encrypt
 * @param {string} outputFile - Path where encrypted file should be saved
 * @param {Object} keys - Encryption keys object
 * @returns {Promise<void>}
 */
export async function encryptBackupFile(inputFile, outputFile, keys) {
  try {
    // Verify input file exists
    await fs.access(inputFile);

    // Use post-quantum-helper to encrypt the file
    await encryptFile(inputFile, outputFile, keys.publicKey);

    // Verify output file was created
    await fs.access(outputFile);
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a file using post-quantum encryption
 * @param {string} inputFile - Path to encrypted file
 * @param {string} outputFile - Path where decrypted file should be saved
 * @param {Object} keys - Encryption keys object
 * @returns {Promise<void>}
 */
export async function decryptBackupFile(inputFile, outputFile, keys) {
  try {
    // Verify input file exists
    await fs.access(inputFile);

    // Use post-quantum-helper to decrypt the file
    await decryptFile(inputFile, outputFile, keys.privateKey);

    // Verify output file was created
    await fs.access(outputFile);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Get the size of a file in bytes
 * @param {string} filePath - Path to file
 * @returns {Promise<number>} File size in bytes
 */
export async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}