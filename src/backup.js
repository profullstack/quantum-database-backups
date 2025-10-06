import { promises as fs } from 'fs';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import path from 'path';
import { generateBackupFilename, ensureDirectory } from './utils.js';
import { getProvider, defaultProvider } from './providers/index.js';

/**
 * Execute database dump using the specified provider
 * @param {string} outputPath - Path where dump file should be saved
 * @param {string} providerName - Name of the database provider (default: 'supabase')
 * @param {Object} options - Provider-specific options
 * @returns {Promise<void>}
 */
export async function dumpDatabase(outputPath, providerName = 'supabase', options = {}) {
  try {
    const provider = providerName ? getProvider(providerName) : defaultProvider;
    
    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `${provider.displayName} is not available. Please ensure it is installed and configured.`
      );
    }

    // Create the dump using the provider
    await provider.createDump(outputPath, options);

    // Verify the file was created
    await fs.access(outputPath);
  } catch (error) {
    throw new Error(`Database dump failed: ${error.message}`);
  }
}

/**
 * Create a ZIP archive from a file
 * @param {string} sourceFile - Path to file to compress
 * @param {string} outputZip - Path where ZIP should be saved
 * @returns {Promise<void>}
 */
export async function createZipArchive(sourceFile, outputZip) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputZip);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (error) => {
      reject(new Error(`ZIP creation failed: ${error.message}`));
    });

    archive.pipe(output);
    archive.file(sourceFile, { name: path.basename(sourceFile) });
    archive.finalize();
  });
}

/**
 * Create a complete database backup (dump + zip)
 * @param {string} dbName - Database name for filename
 * @param {string} workDir - Working directory for temporary files
 * @param {string} providerName - Name of the database provider (default: 'supabase')
 * @param {Object} providerOptions - Provider-specific options
 * @returns {Promise<{dumpFile: string, zipFile: string}>} Paths to created files
 */
export async function createBackup(
  dbName,
  workDir = './backups',
  providerName = 'supabase',
  providerOptions = {}
) {
  await ensureDirectory(workDir);

  // Get provider to determine file extension
  const provider = providerName ? getProvider(providerName) : defaultProvider;
  const fileExtension = provider.getFileExtension();

  const dumpFilename = generateBackupFilename(dbName, fileExtension);
  const zipFilename = generateBackupFilename(dbName, 'zip');

  const dumpPath = path.join(workDir, dumpFilename);
  const zipPath = path.join(workDir, zipFilename);

  try {
    console.log(`Creating ${provider.displayName} database dump: ${dumpFilename}`);
    await dumpDatabase(dumpPath, providerName, providerOptions);

    console.log(`Creating ZIP archive: ${zipFilename}`);
    await createZipArchive(dumpPath, zipPath);

    return {
      dumpFile: dumpPath,
      zipFile: zipPath,
    };
  } catch (error) {
    // Clean up partial files on error
    try {
      await fs.unlink(dumpPath).catch(() => {});
      await fs.unlink(zipPath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}