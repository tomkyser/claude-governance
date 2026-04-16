import { debug } from '../../utils';
import { runDetectors } from './types';

const MSG_OVERRIDE_SIGNATURE = '__gov_msg_override__';
const CONTENT_OVERRIDE_SIGNATURE = '__gov_content_override__';

export const writeMessageOverridePatch = (content: string): string | null => {
  if (content.includes(MSG_OVERRIDE_SIGNATURE)) {
    debug('  message override: already applied');
    return content;
  }

  const detection = runDetectors(content, [
    {
      name: 'esbuild-oOY-message-renderer',
      fn: js => {
        const m = js.match(
          /(_6\(94\)),\s*\{\s*message:\s*_,\s*lookups:\s*([$\w]+)[\s\S]{50,400}switch\s*\(\s*_\.type\s*\)\s*\{\s*case\s*"attachment"/
        );
        return m
          ? {
              match: m,
              detector: 'esbuild-oOY-message-renderer',
              confidence: 'high' as const,
            }
          : null;
      },
    },
    {
      name: 'minified-message-renderer',
      fn: js => {
        const m = js.match(
          /(_6\(94\)),\{message:_,lookups:([$\w]+)[\s\S]{50,300}switch\(_\.type\)\{case"attachment"/
        );
        return m
          ? {
              match: m,
              detector: 'minified-message-renderer',
              confidence: 'medium' as const,
            }
          : null;
      },
    },
  ]);

  if (!detection) return null;

  const matchIdx = (detection.match as RegExpMatchArray).index!;
  const ctx = content.substring(matchIdx, matchIdx + 2000);

  const reactMatch = ctx.match(/([$\w]+)\.createElement\(/);
  const R = reactMatch?.[1] || 'J9';

  const switchTarget = 'switch (_.type) {';
  const switchIdx = content.indexOf(switchTarget, matchIdx);
  if (switchIdx === -1) return null;

  const overrideCheck = [
    'var ' + MSG_OVERRIDE_SIGNATURE + '=1;',
    'if(!globalThis.__govOverridesInit){',
    'globalThis.__govOverridesInit=1;',
    'try{var _ovrPath=require("node:path").join(',
    'require("node:os").homedir(),".claude-governance","overrides","defaults.js");',
    'require(_ovrPath);}catch(_){}',
    '}',
    'if(globalThis.__govMessageOverrides){',
    'var _ovr=globalThis.__govMessageOverrides[_.type];',
    'if(typeof _ovr==="function"){',
    'try{var _ovrResult=_ovr(_,q,' + R + ');',
    'if(_ovrResult!==null&&_ovrResult!==void 0)return _ovrResult;',
    '}catch(_ovrErr){}',
    '}',
    '}',
  ].join('');

  const result = content.substring(0, switchIdx) +
    overrideCheck +
    content.substring(switchIdx);

  debug('  message override: injected at oOY switch');
  return result;
};

export const writeContentOverridePatch = (content: string): string | null => {
  if (content.includes(CONTENT_OVERRIDE_SIGNATURE)) {
    debug('  content override: already applied');
    return content;
  }

  const detection = runDetectors(content, [
    {
      name: 'esbuild-sOY-content-renderer',
      fn: js => {
        const m = js.match(
          /(_6\(48\)),\s*\{\s*param:\s*_,\s*addMargin:\s*([$\w]+)[\s\S]{50,400}switch\s*\(\s*_\.type\s*\)\s*\{\s*case\s*"tool_use"/
        );
        return m
          ? {
              match: m,
              detector: 'esbuild-sOY-content-renderer',
              confidence: 'high' as const,
            }
          : null;
      },
    },
    {
      name: 'minified-content-renderer',
      fn: js => {
        const m = js.match(
          /(_6\(48\)),\{param:_,addMargin:([$\w]+)[\s\S]{50,300}switch\(_\.type\)\{case"tool_use"/
        );
        return m
          ? {
              match: m,
              detector: 'minified-content-renderer',
              confidence: 'medium' as const,
            }
          : null;
      },
    },
  ]);

  if (!detection) return null;

  const matchIdx = (detection.match as RegExpMatchArray).index!;
  const ctx = content.substring(matchIdx, matchIdx + 2000);

  const reactMatch = ctx.match(/([$\w]+)\.createElement\(/);
  const R = reactMatch?.[1] || 'J9';

  const switchTarget = 'switch (_.type) {';
  const switchIdx = content.indexOf(switchTarget, matchIdx);
  if (switchIdx === -1) return null;

  const overrideCheck = [
    'var ' + CONTENT_OVERRIDE_SIGNATURE + '=1;',
    'if(globalThis.__govContentOverrides){',
    'var _covr=globalThis.__govContentOverrides[_.type];',
    'if(typeof _covr==="function"){',
    'try{var _covrResult=_covr(_,q,' + R + ');',
    'if(_covrResult!==null&&_covrResult!==void 0)return _covrResult;',
    '}catch(_covrErr){}',
    '}',
    '}',
  ].join('');

  const result = content.substring(0, switchIdx) +
    overrideCheck +
    content.substring(switchIdx);

  debug('  content override: injected at sOY switch');
  return result;
};
