// claude-governance auto-discovery tool loader
// Scans this directory for .js files, requires each one, and collects exported tools.
// Drop a .js file here → it's loaded automatically. No editing needed.
//
// Each tool file should export one of:
//   - A single tool object: module.exports = { name, inputJSONSchema, call, prompt, description }
//   - An array of tools: module.exports = [{ name, ... }, ...]
//   - A named export: module.exports = { default: toolOrArray } or { tools: [...] }

const fs = require('fs');
const path = require('path');

const toolsDir = __dirname;
const tools = [];

try {
  const files = fs.readdirSync(toolsDir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === 'index.js' || !file.endsWith('.js')) continue;
    try {
      const mod = require(path.join(toolsDir, file));
      const exported = Array.isArray(mod) ? mod : mod.default || mod.tools || [mod];
      const items = Array.isArray(exported) ? exported : [exported];
      for (let j = 0; j < items.length; j++) {
        if (items[j] && items[j].name) tools.push(items[j]);
      }
    } catch (e) {
      // Skip broken tool files silently — don't break other tools
    }
  }
} catch (e) {
  // Directory read failure — return empty array
}

module.exports = tools;
