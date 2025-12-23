import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  base: '/docs',
  outDir: '../web/static/docs',
  integrations: [
    starlight({
      title: 'SpriteBox',
      description: 'Open-source multiplayer pixel art game documentation',
      logo: {
        src: './src/assets/logo.png',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/ibimspumo/SpriteBox',
      },
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        de: {
          label: 'Deutsch',
          lang: 'de',
        },
      },
      sidebar: [
        {
          label: 'Getting Started',
          translations: { de: 'Erste Schritte' },
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Architecture',
          translations: { de: 'Architektur' },
          autogenerate: { directory: 'architecture' },
        },
        {
          label: 'API Reference',
          translations: { de: 'API-Referenz' },
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Contributing',
          translations: { de: 'Mitwirken' },
          autogenerate: { directory: 'contributing' },
        },
      ],
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            href: '/favicon.png',
            type: 'image/png',
          },
        },
      ],
    }),
  ],
});
