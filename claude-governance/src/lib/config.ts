/**
 * Config Utilities
 *
 * Access claude-governance configuration paths and data.
 */

import {
  getConfigDir,
  CONFIG_FILE,
  SYSTEM_PROMPTS_DIR,
  readConfigFile,
} from '../config';
import { TweakccConfig } from './types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the config directory path.
 *
 * Respects CLAUDE_GOVERNANCE_CONFIG_DIR environment variable.
 * Falls back to ~/.claude-governance, ~/.tweakcc (legacy), or $XDG_CONFIG_HOME/claude-governance.
 *
 * @returns Absolute path to config directory
 */
export function getTweakccConfigDir(): string {
  return getConfigDir();
}

/**
 * Get the config file path.
 */
export function getTweakccConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Get the system prompts directory.
 *
 * Editable markdown files for system prompt overrides.
 */
export function getTweakccSystemPromptsDir(): string {
  return SYSTEM_PROMPTS_DIR;
}

/**
 * Read the config file.
 */
export async function readTweakccConfig(): Promise<TweakccConfig> {
  return await readConfigFile();
}
