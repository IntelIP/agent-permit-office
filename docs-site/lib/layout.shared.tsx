import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'PermitGraph Docs',
    },
    links: [
      {
        text: 'GitHub',
        url: 'https://github.com/IntelIP/agent-permit-office',
      },
    ],
  };
}
