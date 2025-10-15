import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: {
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-swiper': ['swiper'],
        }
      }
    },
    
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.warn']
      }
    },
    
    target: 'es2015',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@public': path.resolve(__dirname, './public')
    }
  },
  
  server: {
    host: '0.0.0.0',
    port: 8080,
    open: true,
    cors: true
  },
  
  preview: {
    port: 4173,
    host: '0.0.0.0'
  },
  
  envPrefix: 'VITE_',
  
  // Отключаем проверку TypeScript
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
});
