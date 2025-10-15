import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

async function bundle() {
  try {
    // Bundle main application
    await esbuild.build({
      entryPoints: ['js/app.js'],
      bundle: true,
      format: 'esm',
      outfile: 'dist/js/main.js',
      minify: true,
      sourcemap: false,
      platform: 'browser',
      target: ['es2020'],
      external: [],
      loader: {
        '.js': 'js',
      },
    });

    console.log('✅ JavaScript bundled successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

bundle();
