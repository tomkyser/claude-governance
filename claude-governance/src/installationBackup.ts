import fs from 'node:fs/promises';

import {
  CLIJS_BACKUP_FILE,
  ensureConfigDir,
  NATIVE_BINARY_BACKUP_FILE,
  updateConfigFile,
} from './config';
import { clearAllAppliedHashes } from './systemPromptHashIndex';
import { debug, replaceFileBreakingHardLinks, doesFileExist } from './utils';
import {
  binarySafeCopy,
  createWorkingCopy,
  deployToInstallPath,
  downloadVirginBinary,
  getVirginPath,
} from './binaryVault';
import { extractClaudeJsFromNativeInstallation } from './nativeInstallation';
import { isContentPatched } from './patches/governance';
import { ClaudeCodeInstallationInfo } from './types';

export const backupClijs = async (ccInstInfo: ClaudeCodeInstallationInfo) => {
  // Only backup cli.js for NPM installs (when cliPath is set)
  if (!ccInstInfo.cliPath) {
    debug('backupClijs: Skipping for native installation (no cliPath)');
    return;
  }

  await ensureConfigDir();
  debug(`Backing up cli.js to ${CLIJS_BACKUP_FILE}`);
  await fs.copyFile(ccInstInfo.cliPath, CLIJS_BACKUP_FILE);
  await updateConfigFile(config => {
    config.changesApplied = false;
    config.ccVersion = ccInstInfo.version;
  });
};

/**
 * Backs up the native installation binary to the config directory.
 */
export const backupNativeBinary = async (
  ccInstInfo: ClaudeCodeInstallationInfo
) => {
  if (!ccInstInfo.nativeInstallationPath) {
    return;
  }

  await ensureConfigDir();
  debug(`Backing up native binary to ${NATIVE_BINARY_BACKUP_FILE}`);
  // CRITICAL: Use binary-safe copy, NOT Node.js fs.copyFile().
  // Node.js v24 fs.copyFile() corrupts Mach-O binaries by replacing
  // non-UTF-8 bytes with U+FFFD, bloating 201MB → 304MB.
  binarySafeCopy(
    ccInstInfo.nativeInstallationPath,
    NATIVE_BINARY_BACKUP_FILE
  );
  await updateConfigFile(config => {
    config.changesApplied = false;
    config.ccVersion = ccInstInfo.version;
  });
};

/**
 * Restores the original cli.js file from the backup.
 * Only applies to NPM installs. For native installs, this is a no-op.
 */
export const restoreClijsFromBackup = async (
  ccInstInfo: ClaudeCodeInstallationInfo
): Promise<boolean> => {
  // Only restore cli.js for NPM installs (when cliPath is set)
  if (!ccInstInfo.cliPath) {
    debug(
      'restoreClijsFromBackup: Skipping for native installation (no cliPath)'
    );
    return false;
  }

  debug(`Restoring cli.js from backup to ${ccInstInfo.cliPath}`);

  // Read the backup content
  const backupContent = await fs.readFile(CLIJS_BACKUP_FILE);

  // Replace the file, breaking hard links and preserving permissions
  await replaceFileBreakingHardLinks(
    ccInstInfo.cliPath,
    backupContent,
    'restore'
  );

  // Clear all applied hashes since we're restoring to defaults
  await clearAllAppliedHashes();

  await updateConfigFile(config => {
    config.changesApplied = false;
  });

  return true;
};

/**
 * Restores the native installation binary from backup.
 * This function restores the original native binary and clears changesApplied,
 * so patches can be re-applied from a clean state.
 */
export const restoreNativeBinaryFromBackup = async (
  ccInstInfo: ClaudeCodeInstallationInfo
): Promise<boolean> => {
  if (!ccInstInfo.nativeInstallationPath) {
    debug(
      'restoreNativeBinaryFromBackup: No native installation path, skipping'
    );
    return false;
  }

  const backupExists = await doesFileExist(NATIVE_BINARY_BACKUP_FILE);

  if (backupExists) {
    debug('Checking backup for governance contamination...');
    const probe = extractClaudeJsFromNativeInstallation(
      NATIVE_BINARY_BACKUP_FILE
    );
    if (probe && isContentPatched(probe.toString('utf8'))) {
      console.log(
        '⚠ Backup is contaminated (contains governance patches). ' +
          'Falling back to virgin vault.'
      );
      debug(
        'restoreNativeBinaryFromBackup: backup contaminated, trying vault'
      );
    } else {
      debug(
        `Restoring native binary from clean backup to ${ccInstInfo.nativeInstallationPath}`
      );
      binarySafeCopy(
        NATIVE_BINARY_BACKUP_FILE,
        ccInstInfo.nativeInstallationPath
      );
      return true;
    }
  }

  const version = ccInstInfo.version;
  const virginPath = getVirginPath(version);
  const virginExists = await doesFileExist(virginPath);

  if (!virginExists) {
    debug(
      `restoreNativeBinaryFromBackup: no virgin binary for ${version}, attempting download`
    );
    try {
      await downloadVirginBinary(version);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `No clean binary available for restore.\n` +
          `Backup: ${backupExists ? 'contaminated' : 'missing'}\n` +
          `Virgin vault: download failed — ${msg}\n` +
          `Reinstall Claude Code to get a clean binary.`
      );
    }
  }

  debug(
    `Restoring native binary from virgin vault (${version}) to ${ccInstInfo.nativeInstallationPath}`
  );
  createWorkingCopy(version);
  deployToInstallPath(version, ccInstInfo.nativeInstallationPath);

  if (backupExists) {
    debug('Removing contaminated backup');
    await fs.unlink(NATIVE_BINARY_BACKUP_FILE);
  }

  return true;
};
