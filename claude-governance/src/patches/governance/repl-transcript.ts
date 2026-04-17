import { debug } from '../../utils';

const REPL_TRANSCRIPT_SIGNATURE = '__repl_transcript_patched__';

export const writeReplTranscriptPatch = (content: string): string | null => {
  if (content.includes(REPL_TRANSCRIPT_SIGNATURE)) {
    debug('  repl transcript: already applied');
    return content;
  }

  const target = 'if (hr8() === "ant") return _;';
  if (!content.includes(target)) {
    debug('  repl transcript: target string not found in D_8');
    return null;
  }

  const replacement =
    'if (true/*' + REPL_TRANSCRIPT_SIGNATURE + '*/) return _;';

  const result = content.replace(target, replacement);
  if (result === content) {
    debug('  repl transcript: replacement produced no change');
    return null;
  }

  debug('  repl transcript: D_8 always returns early, REPL preserved in transcripts');
  return result;
};
