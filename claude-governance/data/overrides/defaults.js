// claude-governance default message overrides
// Loaded automatically by the message-override binary patch on first render.
// Registers handlers on globalThis.__govMessageOverrides and __govContentOverrides.
// Also scans ~/.claude-governance/components/ for user-defined overrides.

(function() {
  if (!globalThis.__govMessageOverrides) globalThis.__govMessageOverrides = {};
  if (!globalThis.__govContentOverrides) globalThis.__govContentOverrides = {};

  // Scan components directory for override handlers
  try {
    var fs = require("node:fs");
    var path = require("node:path");
    var os = require("node:os");
    var componentsDir = path.join(os.homedir(), ".claude-governance", "components");

    if (fs.existsSync(componentsDir)) {
      var files = fs.readdirSync(componentsDir).filter(function(f) {
        return f.endsWith(".js");
      });

      for (var i = 0; i < files.length; i++) {
        try {
          var mod = require(path.join(componentsDir, files[i]));
          var component = typeof mod === "function" ? mod() : mod;
          if (!component) continue;

          if (component.messageOverrides) {
            var mTypes = Object.keys(component.messageOverrides);
            for (var j = 0; j < mTypes.length; j++) {
              var mType = mTypes[j];
              if (typeof component.messageOverrides[mType] === "function") {
                globalThis.__govMessageOverrides[mType] = component.messageOverrides[mType];
              }
            }
          }

          if (component.contentOverrides) {
            var cTypes = Object.keys(component.contentOverrides);
            for (var k = 0; k < cTypes.length; k++) {
              var cType = cTypes[k];
              if (typeof component.contentOverrides[cType] === "function") {
                globalThis.__govContentOverrides[cType] = component.contentOverrides[cType];
              }
            }
          }
        } catch (_compErr) {
          // Individual component failure must not crash the renderer
        }
      }
    }
  } catch (_scanErr) {
    // Components directory scan failure is non-fatal
  }
})();
