import { defineConfig } from 'tsdown';

const common = {
  format: 'cjs' as const,
  outDir: 'data/tools',
  clean: false,
  dts: false,
  fixedExtension: false,
  splitting: false,
  target: 'node20' as const,
  external: [/^node:/],
};

export default defineConfig([
  { ...common, entry: { ping: 'src/tools/ping/index.ts' } },
  { ...common, entry: { repl: 'src/tools/repl/index.ts' } },
  { ...common, entry: { tungsten: 'src/tools/tungsten/index.ts' } },
]);
