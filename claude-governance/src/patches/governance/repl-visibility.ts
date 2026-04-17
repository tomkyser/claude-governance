import { debug } from '../../utils';

const REPL_VISIBILITY_SIGNATURE = '__repl_visibility_patched__';

export const writeReplVisibilityPatch = (content: string): string | null => {
  if (content.includes(REPL_VISIBILITY_SIGNATURE)) {
    debug('  repl visibility: already applied');
    return content;
  }

  const target =
    'isREPL: true, isMemoryWrite: false, isAbsorbedSilently: true';
  if (!content.includes(target)) {
    debug('  repl visibility: target string not found');
    return null;
  }

  const replacement =
    'isREPL: true, isMemoryWrite: false, isAbsorbedSilently: false/*' +
    REPL_VISIBILITY_SIGNATURE +
    '*/';

  const result = content.replace(target, replacement);
  if (result === content) {
    debug('  repl visibility: replacement produced no change');
    return null;
  }

  debug('  repl visibility: isAbsorbedSilently changed to false');
  return result;
};
