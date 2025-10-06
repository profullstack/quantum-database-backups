import { promises as fs } from 'fs';
import path from 'path';
import { getProvider, defaultProvider } from './providers/index.js';
import { decryptBackupFile } from './encrypt.js';
import { ensureDirectory } from './utils.js';

/**
 * Extract a ZIP archive
 * @param {string} zipPath - Path to ZIP file
 * @param {string} outputDir - Directory to extract to
 * @returns {Promise<string>} Path to extracted dump file
 */
async function extractZipArchive(zipPath, outputDir) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  await ensureDirectory(outputDir);

  try {
    await execAsync(`unzip -o "${zipPath}" -d "${outputDir}"`);

    // Find the extracted dump file
    const files = await fs.readdir(outputDir);
    const dumpFile = files.find(
      (f) =>
        f.endsWith('.sql') ||
        f.endsWith('.dump') ||
        f.endsWith('.archive') ||
        f.endsWith('.bson')
    );

    if (!dumpFile) {
      throw new Error('No database dump file found in archive');
    }

    return path.join(outputDir, dumpFile);
  } catch (error) {
    throw new Error(`Failed to extract archive: ${error.message}`);
  }
}

/**
 * Restore a database from an encrypted backup
 * @param {string} encryptedBackupPath - Path to encrypted backup file
 * @param {Object} keys - Encryption keys
 * @param {string} providerName - Database provider name
 * @param {Object} providerOptions - Provider-specific restore options
 * @param {string} workDir - Working directory for temporary files
 * @returns {Promise<void>}
 */
export async function restoreFromBackup(
  encryptedBackupPath,
  keys,
  providerName = 'supabase',
  providerOptions = {},
  workDir = './restore-temp'
) {
  await ensureDirectory(workDir);

  const decryptedZipPath = path.join(workDir, 'decrypted-backup.zip');
  const extractDir = path.join(workDir, 'extracted');

  try {
    // Step 1: Decrypt the backup
    console.log('🔓 Decrypting backup...');
    await decryptBackupFile(encryptedBackupPath, decryptedZipPath, keys);
    console.log('✓ Backup decrypted\n');

    // Step 2: Extract the ZIP archive
    console.log('📦 Extracting archive...');
    const dumpFilePath = await extractZipArchive(decryptedZipPath, extractDir);
    console.log(`✓ Archive extracted: ${path.basename(dumpFilePath)}\n`);

    // Step 3: Restore using the provider
    const provider = providerName ? getProvider(providerName) : defaultProvider;

    console.log(`🔄 Restoring to ${provider.displayName} database...`);
    await provider.restoreFromDump(dumpFilePath, providerOptions);
    console.log('✓ Database restored successfully\n');

    return dumpFilePath;
  } finally {
    // Clean up temporary files
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Warning: Failed to clean up temporary files:', error.message);
    }
  }
}