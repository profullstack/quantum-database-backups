import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Create email transporter from environment variables or config
 * @returns {Object} Nodemailer transporter
 */
export function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  if (!config.auth.user || !config.auth.pass) {
    throw new Error(
      'SMTP credentials not found. Set SMTP_USER and SMTP_PASS environment variables.'
    );
  }

  return nodemailer.createTransport(config);
}

/**
 * Send an email with encrypted backup attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Email body text
 * @param {string} options.attachmentPath - Path to file to attach
 * @param {Object} [options.transporter] - Optional custom transporter
 * @returns {Promise<Object>} Email send result
 */
export async function sendBackupEmail({
  to,
  subject,
  text,
  attachmentPath,
  transporter,
}) {
  const transport = transporter || createTransporter();

  // Verify attachment exists
  await fs.access(attachmentPath);

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(attachmentPath),
        path: attachmentPath,
      },
    ],
  };

  try {
    const info = await transport.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Generate email content for backup notification
 * @param {string} dbName - Database name
 * @param {string} filename - Backup filename
 * @param {string} fileSize - Formatted file size
 * @returns {Object} Email subject and text
 */
export function generateBackupEmailContent(dbName, filename, fileSize) {
  const subject = `Encrypted Database Backup - ${dbName}`;

  const text = `
Your encrypted database backup is ready.

Database: ${dbName}
Filename: ${filename}
File Size: ${fileSize}
Timestamp: ${new Date().toISOString()}

This backup has been encrypted using post-quantum cryptography.
Keep your decryption keys safe - they are required to restore this backup.

IMPORTANT SECURITY NOTES:
- Your encryption keys are NOT stored anywhere
- You are solely responsible for keeping your keys safe
- Without your keys, this backup cannot be decrypted
- Store your keys in a secure location separate from this backup

To decrypt this backup, you will need:
1. Your keys.json file
2. The qdb CLI tool
3. The command: qdb decrypt --input <encrypted-file> --output <output-file> --keys <keys.json>
`.trim();

  return { subject, text };
}

/**
 * Verify SMTP configuration is available
 * @returns {boolean} True if SMTP is configured
 */
export function isSmtpConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}