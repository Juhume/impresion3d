// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://juhume.github.io',
  base: '/impresion3d',
  vite: {
    server: {
      allowedHosts: true
    }
  }
});
