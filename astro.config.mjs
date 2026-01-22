// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://juhume.github.io',
  base: '/impresion3d',
  trailingSlash: 'always',

  vite: {
    server: {
      allowedHosts: true
    }
  },

  integrations: [react()]
});