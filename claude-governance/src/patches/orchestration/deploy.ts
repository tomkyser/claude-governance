import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';

import { CONFIG_DIR, SYSTEM_PROMPTS_DIR } from '../../config';
import { debug } from '../../utils';

// =============================================================================
// Tool Deployment
// =============================================================================

const TOOLS_DIR = path.join(CONFIG_DIR, 'tools');
export { TOOLS_DIR };

export const deployTools = async (): Promise<number> => {
  const srcDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    'data',
    'tools'
  );

  if (!fsSync.existsSync(srcDir)) {
    debug(`deployTools: source dir not found at ${srcDir}`);
    return 0;
  }

  await fs.mkdir(TOOLS_DIR, { recursive: true });

  const files = fsSync.readdirSync(srcDir).filter(f => f.endsWith('.js'));
  let deployed = 0;

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(TOOLS_DIR, file);
    const srcContent = fsSync.readFileSync(srcPath, 'utf8');

    let needsCopy = true;
    if (fsSync.existsSync(dstPath)) {
      const dstContent = fsSync.readFileSync(dstPath, 'utf8');
      if (srcContent === dstContent) needsCopy = false;
    }

    if (needsCopy) {
      await fs.writeFile(dstPath, srcContent, 'utf8');
      deployed++;
      debug(`deployTools: deployed ${file}`);
    }
  }

  return deployed;
};

// =============================================================================
// UI Component Deployment
// =============================================================================

const UI_DIR = path.join(CONFIG_DIR, 'ui');
export { UI_DIR };

export const deployUiComponents = async (): Promise<number> => {
  const srcDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    'data',
    'ui'
  );

  if (!fsSync.existsSync(srcDir)) {
    debug(`deployUiComponents: source dir not found at ${srcDir}`);
    return 0;
  }

  await fs.mkdir(UI_DIR, { recursive: true });

  const files = fsSync.readdirSync(srcDir).filter(f => f.endsWith('.js'));
  let deployed = 0;

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(UI_DIR, file);
    const srcContent = fsSync.readFileSync(srcPath, 'utf8');

    let needsCopy = true;
    if (fsSync.existsSync(dstPath)) {
      const dstContent = fsSync.readFileSync(dstPath, 'utf8');
      if (srcContent === dstContent) needsCopy = false;
    }

    if (needsCopy) {
      await fs.writeFile(dstPath, srcContent, 'utf8');
      deployed++;
      debug(`deployUiComponents: deployed ${file}`);
    }
  }

  return deployed;
};

// =============================================================================
// =============================================================================
// Component Override Deployment
// =============================================================================

const COMPONENTS_DIR = path.join(CONFIG_DIR, 'components');
export { COMPONENTS_DIR };

export const deployComponents = async (): Promise<number> => {
  const srcDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    'data',
    'components'
  );

  if (!fsSync.existsSync(srcDir)) {
    debug(`deployComponents: source dir not found at ${srcDir}`);
    return 0;
  }

  await fs.mkdir(COMPONENTS_DIR, { recursive: true });

  const files = fsSync.readdirSync(srcDir).filter(f => f.endsWith('.js'));
  let deployed = 0;

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(COMPONENTS_DIR, file);
    const srcContent = fsSync.readFileSync(srcPath, 'utf8');

    let needsCopy = true;
    if (fsSync.existsSync(dstPath)) {
      const dstContent = fsSync.readFileSync(dstPath, 'utf8');
      if (srcContent === dstContent) needsCopy = false;
    }

    if (needsCopy) {
      await fs.writeFile(dstPath, srcContent, 'utf8');
      deployed++;
      debug(`deployComponents: deployed ${file}`);
    }
  }

  return deployed;
};

// Prompt Override Deployment (G5)
// =============================================================================

// =============================================================================
// Override Deployment
// =============================================================================

const OVERRIDES_DIR = path.join(CONFIG_DIR, 'overrides');
export { OVERRIDES_DIR };

export const deployOverrides = async (): Promise<number> => {
  const srcDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    'data',
    'overrides'
  );

  if (!fsSync.existsSync(srcDir)) {
    debug(`deployOverrides: source dir not found at ${srcDir}`);
    return 0;
  }

  await fs.mkdir(OVERRIDES_DIR, { recursive: true });

  const files = fsSync.readdirSync(srcDir).filter(f => f.endsWith('.js'));
  let deployed = 0;

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(OVERRIDES_DIR, file);
    const srcContent = fsSync.readFileSync(srcPath, 'utf8');

    let needsCopy = true;
    if (fsSync.existsSync(dstPath)) {
      const dstContent = fsSync.readFileSync(dstPath, 'utf8');
      if (srcContent === dstContent) needsCopy = false;
    }

    if (needsCopy) {
      await fs.writeFile(dstPath, srcContent, 'utf8');
      deployed++;
      debug(`deployOverrides: deployed ${file}`);
    }
  }

  return deployed;
};

export const deployPromptOverrides = async (): Promise<number> => {
  const overridesDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    'data',
    'overrides'
  );

  if (!fsSync.existsSync(overridesDir)) {
    debug(`deployPromptOverrides: overrides dir not found at ${overridesDir}`);
    return 0;
  }

  await fs.mkdir(SYSTEM_PROMPTS_DIR, { recursive: true });

  const files = fsSync.readdirSync(overridesDir).filter(f => f.endsWith('.md'));
  let deployed = 0;

  for (const file of files) {
    const srcPath = path.join(overridesDir, file);
    const dstPath = path.join(SYSTEM_PROMPTS_DIR, file);
    const srcContent = fsSync.readFileSync(srcPath, 'utf8');

    let needsCopy = true;
    if (fsSync.existsSync(dstPath)) {
      const dstContent = fsSync.readFileSync(dstPath, 'utf8');
      if (srcContent === dstContent) needsCopy = false;
    }

    if (needsCopy) {
      await fs.writeFile(dstPath, srcContent, 'utf8');
      deployed++;
      debug(`deployPromptOverrides: deployed ${file}`);
    }
  }

  return deployed;
};
