/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'TypeScript',
      items: [
        {
          type: 'category',
          label: 'Threads',
          items: [
            'typescript/threads/index',
            'typescript/threads/api',
            'typescript/threads/react-hooks',
            'typescript/threads/adapters',
            'typescript/threads/examples',
          ],
        },
        {
          type: 'category',
          label: 'Threads LangGraph',
          items: [
            'typescript/threads-langgraph/index',
            'typescript/threads-langgraph/api',
            'typescript/threads-langgraph/examples',
            {
              type: 'category',
              label: 'Guides',
              items: [
                'typescript/threads-langgraph/guides/integration',
                'typescript/threads-langgraph/guides/migration',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Chat Next.js',
          items: [
            'typescript/chat-nextjs/index',
            'typescript/chat-nextjs/api',
            {
              type: 'category',
              label: 'Guides',
              items: [
                'typescript/chat-nextjs/guides/getting-started',
                'typescript/chat-nextjs/guides/authentication',
                'typescript/chat-nextjs/guides/server-components',
              ],
            },
            'typescript/chat-nextjs/examples',
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;
