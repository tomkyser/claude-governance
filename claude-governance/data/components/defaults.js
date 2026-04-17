// claude-governance default component: attachment visibility
// Makes null-rendered attachments visible in the TUI.
// Handler signature: (message, props, React) → element | null
// Return null to fall through to default rendering.

(function() {
  var refs = globalThis.__govReactRefs;
  if (!refs || !refs.R || !refs.Text) return {};

  return {
    messageOverrides: {},
    contentOverrides: {}
  };
})();
