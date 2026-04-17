import { debug } from '../../utils';
import { runDetectors } from './types';

const UNHIDE_SIGNATURE = '__gov_unhide_cmds__';

export const writeUnhideCommandsPatch = (content: string): string | null => {
  if (content.includes(UNHIDE_SIGNATURE)) {
    debug('  unhide commands: already applied');
    return content;
  }

  // Strategy: Find the command suggestion function (QS5/g7A equivalent) which
  // builds the Fuse index. It contains .filter((v) => !v.isHidden).map(...)
  // This is the primary gate — if commands aren't in the Fuse index, they
  // won't appear in typeahead at all.
  //
  // We also patch the help panel filters and the typeahead empty-query filter.
  //
  // All command isHidden filters share a structural pattern:
  //   .filter((varName) => !varName.isHidden)
  // We replace the predicate body: !v.isHidden → (true||!v.isHidden)
  // This preserves the variable reference (no dead code elimination risk)
  // while making the filter always pass.

  let patched = content;
  let patchCount = 0;

  // Pattern: .filter((var) => !var.isHidden) in command contexts
  // We need anchors to distinguish from Ink DOM and team discovery uses.
  // Command filters are near: .name, .type==="prompt", Wl()/Vl(), J3(), QS5/g7A
  
  // Approach: Replace all filter predicates that reference .isHidden in a
  // filter callback, BUT only when preceded/followed by command-related code.
  // Since the minified binary has unique structural patterns, we can safely
  // target all .filter((v)=>!v.isHidden) that aren't in the Ink reconciler
  // (which uses node.isHidden = true/false, not filter predicates).

  const detectors = [
    {
      name: 'fuse-index-builder',
      // QS5/g7A: function(H){...let _=H.filter((K)=>!K.isHidden).map(
      pattern: /(functions*[$\w]*s*\([$\w]+\)s*\{[^}]{0,200}?)\.filter\(\s*\(\s*([$\w]+)\s*\)\s*=>\s*!(\2)\.isHidden\s*\)\.map/,
    },
    {
      name: 'help-panel-skills',
      // V.has(x.name)&&!x.isHidden inside .filter(
      pattern: /\.filter\(\s*\(\s*([$\w]+)\s*\)\s*=>\s*[$\w]+\.has\(\1\.name\)\s*&&\s*!\1\.isHidden\s*\)/,
    },
    {
      name: 'help-panel-general',
      // !V.has(x.name)&&!x.isHidden inside .filter(
      pattern: /\.filter\(\s*\(\s*([$\w]+)\s*\)\s*=>\s*![$\w]+\.has\(\1\.name\)\s*&&\s*!\1\.isHidden\s*\)/,
    },
    {
      name: 'typeahead-empty-query',
      // let Y=_.filter((Z)=>!Z.isHidden),D=[]
      pattern: /=\s*[$\w]+\.filter\(\s*\(\s*([$\w]+)\s*\)\s*=>\s*!\1\.isHidden\s*\)\s*,\s*[$\w]+\s*=\s*\[\]/,
    },
    {
      name: 'command-width-calc',
      // useMemo(()=>{let VH=H.filter((SH)=>!SH.isHidden);if(VH.length===0)
      pattern: /useMemo\(\s*\(\s*\)\s*=>\s*\{\s*let\s+[$\w]+\s*=\s*[$\w]+\.filter\(\s*\(\s*([$\w]+)\s*\)\s*=>\s*!\1\.isHidden\s*\)/,
    },
  ];

  // Generic replacement: find all !varName.isHidden in filter callbacks
  // that are NOT in Ink reconciler context (those use assignment, not filter)
  const filterIsHiddenPattern = /\.filter\(\s*\(\s*([$\w]+)\s*\)\s*=>[^)]*?!(\1)\.isHidden/g;
  
  let match;
  const replacements = [];
  while ((match = filterIsHiddenPattern.exec(patched)) !== null) {
    // Verify this isn't in Ink reconciler (check surrounding context)
    const contextStart = Math.max(0, match.index - 100);
    const context = patched.substring(contextStart, match.index + match[0].length + 100);
    
    // Skip Ink DOM context (yogaNode, hideInstance, unhideInstance)
    if (context.includes('yogaNode') || context.includes('hideInstance') || context.includes('unhideInstance')) {
      continue;
    }
    // Skip team discovery context (supportsHideShow, teamName)
    if (context.includes('supportsHideShow') || context.includes('teamName')) {
      continue;
    }

    replacements.push({
      original: `!${match[1]}.isHidden`,
      idx: patched.indexOf(`!${match[1]}.isHidden`, match.index),
    });
  }

  // Apply replacements in reverse order to preserve indices
  replacements.sort((a, b) => b.idx - a.idx);
  for (const rep of replacements) {
    const varName = rep.original.slice(1, rep.original.indexOf('.'));
    patched = patched.substring(0, rep.idx) + 
      '(true||' + varName + '.isHidden)' +
      patched.substring(rep.idx + rep.original.length);
    patchCount++;
  }

  // Also handle the special case: _.some((Y)=>!Y.isHidden&&K(Y))
  // This is the dedup check — if a visible command matches, hide the hidden one.
  // We want hidden commands to always be "visible" so this dedup still works correctly.
  // Actually this one should also pass through since we want all commands visible.

  if (patchCount === 0) {
    debug('  unhide commands: no filter patterns found');
    return null;
  }

  // Insert signature marker
  const signatureInsert = `var ${UNHIDE_SIGNATURE}=1;`;
  
  // Find a safe injection point near the first replacement
  const firstFilterFn = patched.indexOf('.filter(');
  if (firstFilterFn > 0) {
    // Insert at the start of the nearest function scope
    const fnStart = patched.lastIndexOf('function', firstFilterFn);
    if (fnStart > 0) {
      const braceIdx = patched.indexOf('{', fnStart);
      if (braceIdx > 0 && braceIdx < firstFilterFn) {
        patched = patched.substring(0, braceIdx + 1) + signatureInsert + patched.substring(braceIdx + 1);
      }
    }
  }

  debug(`  unhide commands: patched ${patchCount} isHidden filters`);
  return patched;
};
