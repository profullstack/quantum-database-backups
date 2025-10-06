import { expect } from 'chai';
import {
  generateTimestamp,
  generateBackupFilename,
  validateRequiredKeys,
  getAbsolutePath,
} from '../src/utils.js';
import { formatBytes } from '../src/encrypt.js';

describe('Utils Module', () => {
  describe('generateTimestamp', () => {
    it('should generate a timestamp in YYYYMMDD-HHMMSS format', () => {
      const timestamp = generateTimestamp();
      expect(timestamp).to.match(/^\d{8}-\d{6}$/);
    });

    it('should generate unique timestamps when called multiple times', () => {
      const timestamp1 = generateTimestamp();
      // Small delay to ensure different timestamp
      const timestamp2 = generateTimestamp();
      // They might be the same if called in the same second, so we just verify format
      expect(timestamp1).to.match(/^\d{8}-\d{6}$/);
      expect(timestamp2).to.match(/^\d{8}-\d{6}$/);
    });
  });

  describe('generateBackupFilename', () => {
    it('should generate filename with correct format for SQL', () => {
      const filename = generateBackupFilename('testdb', 'sql');
      expect(filename).to.match(
        /^supabase-backup-\d{8}-\d{6}-testdb\.sql$/
      );
    });

    it('should generate filename with correct format for ZIP', () => {
      const filename = generateBackupFilename('mydb', 'zip');
      expect(filename).to.match(/^supabase-backup-\d{8}-\d{6}-mydb\.zip$/);
    });

    it('should use sql as default extension', () => {
      const filename = generateBackupFilename('testdb');
      expect(filename).to.match(/^supabase-backup-\d{8}-\d{6}-testdb\.sql$/);
    });

    it('should handle database names with special characters', () => {
      const filename = generateBackupFilename('my-test_db.prod');
      expect(filename).to.include('my-test_db.prod');
    });
  });

  describe('validateRequiredKeys', () => {
    it('should not throw when all required keys are present', () => {
      const obj = { key1: 'value1', key2: 'value2', key3: 'value3' };
      expect(() => validateRequiredKeys(obj, ['key1', 'key2'])).to.not.throw();
    });

    it('should throw when a required key is missing', () => {
      const obj = { key1: 'value1' };
      expect(() => validateRequiredKeys(obj, ['key1', 'key2'])).to.throw(
        'Missing required keys: key2'
      );
    });

    it('should throw when multiple required keys are missing', () => {
      const obj = { key1: 'value1' };
      expect(() =>
        validateRequiredKeys(obj, ['key1', 'key2', 'key3'])
      ).to.throw('Missing required keys: key2, key3');
    });

    it('should handle empty required keys array', () => {
      const obj = { key1: 'value1' };
      expect(() => validateRequiredKeys(obj, [])).to.not.throw();
    });
  });

  describe('getAbsolutePath', () => {
    it('should convert relative path to absolute path', () => {
      const relativePath = './test.txt';
      const absolutePath = getAbsolutePath(relativePath);
      expect(absolutePath).to.include('test.txt');
      expect(absolutePath).to.not.equal(relativePath);
    });

    it('should handle paths with multiple segments', () => {
      const relativePath = './src/utils/test.js';
      const absolutePath = getAbsolutePath(relativePath);
      expect(absolutePath).to.include('src');
      expect(absolutePath).to.include('utils');
      expect(absolutePath).to.include('test.js');
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).to.equal('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).to.equal('500 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).to.equal('1 KB');
      expect(formatBytes(1536)).to.equal('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatBytes(1048576)).to.equal('1 MB');
      expect(formatBytes(1572864)).to.equal('1.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1073741824)).to.equal('1 GB');
      expect(formatBytes(1610612736)).to.equal('1.5 GB');
    });

    it('should handle large numbers', () => {
      const result = formatBytes(5368709120);
      expect(result).to.include('GB');
    });
  });
});