import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    ping: 'src/tools/ping/index.ts',
    // T6: repl: 'src/tools/repl/index.ts',
    // T7: tungsten: 'src/tools/tungsten/index.ts',
  },
  format: 'cjs',
  outDir: 'data/tools',
  clean: false,
  dts: false,
  fixedExtension: false,
  target: 'node20',
  external: [/^node:/],
});
