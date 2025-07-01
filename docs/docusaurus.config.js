// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'PressW SDKs',
  tagline: 'Multi-language SDKs for AI-powered applications',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://pressw.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/ai-dev-tooling/',

  // GitHub pages deployment config.
  organizationName: 'pressw',
  projectName: 'ai-dev-tooling',
  themes: ['@docusaurus/theme-mermaid'],
  markdown: {
    mermaid: true,
  },

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/pressw/ai-dev-tooling/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'SDK',
        logo: {
          alt: 'PressW Logo',
          src: 'img/pressw-light.svg',
          srcDark: 'img/pressw-dark.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/pressw/ai-dev-tooling',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/pressw/ai-dev-tooling',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'PyPI',
                href: 'https://pypi.org/project/pw-ai-foundation/',
              },
              {
                label: 'npm',
                href: 'https://www.npmjs.com/org/pressw',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} PressW. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['python', 'typescript', 'bash'],
      },
    }),
};

module.exports = config;
