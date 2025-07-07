import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.betaNotice}>
          <span className={styles.betaBadge}>🚧 BETA</span>
          <p className={styles.betaText}>
            These packages are in extremely early beta. We appreciate all feedback and bug reports!
          </p>
        </div>
        <div className={styles.buttons}>
          <Link
            className={clsx('button button--secondary button--lg', styles.getStartedButton)}
            to="/docs/intro"
          >
            🚀 Get Started
          </Link>
          <Link
            className={clsx('button button--outline button--lg', styles.githubButton)}
            to="https://github.com/pressw/ai-dev-tooling"
          >
            ⭐ GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

const PackageCard = ({ title, description, status, docLink, icon, category }) => {
  return (
    <div className={clsx('col col--6', styles.packageCard)}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconContainer}>{icon}</div>
          <div>
            <h3 className={styles.cardTitle}>{title}</h3>
            <span className={clsx(styles.badge, styles[`badge${category}`])}>{category}</span>
          </div>
          {status && (
            <span
              className={clsx(styles.statusBadge, styles[status.toLowerCase().replace(' ', '')])}
            >
              {status}
            </span>
          )}
        </div>
        <p className={styles.cardDescription}>{description}</p>
        {docLink && status !== 'Coming Soon' ? (
          <Link className={clsx('button button--primary', styles.cardButton)} to={docLink}>
            📖 View Docs
          </Link>
        ) : (
          <div className={styles.comingSoonButton}>⏳ Coming Soon</div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  const packages = [
    {
      title: '@pressw/threads',
      description:
        'Flexible thread management library for building conversational interfaces, support systems, task management, and any threaded data structure. Database agnostic with React hooks.',
      category: 'TypeScript',
      icon: '🧵',
      docLink: '/docs/typescript/threads',
    },
    {
      title: '@pressw/chat-nextjs',
      description:
        'Next.js specific integrations for threads including route handlers, Server Components support, and optimized SSR/SSG functionality.',
      category: 'TypeScript',
      icon: '▲',
      docLink: '/docs/typescript/chat-nextjs',
    },
    {
      title: 'pw-ai-foundation',
      description:
        'Python SDK with foundation models, utilities, and type-safe interfaces using Pydantic for AI application development.',
      category: 'Python',
      icon: '🐍',
      status: 'Coming Soon',
    },
    {
      title: '@pressw/chat-ui',
      description:
        'Pre-built React UI components for chat interfaces with customizable styling, themes, and seamless threads integration.',
      category: 'TypeScript',
      icon: '🎨',
      status: 'Coming Soon',
    },
  ];

  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Multi-language SDK for AI-powered applications"
    >
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>🛠️ Our Packages</h2>
              <p className={styles.sectionSubtitle}>
                Build powerful AI applications with our comprehensive SDK ecosystem
              </p>
            </div>
            <div className="row">
              {packages.map((pkg, idx) => (
                <PackageCard key={idx} {...pkg} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.betaFeedback}>
          <div className="container">
            <div className={styles.feedbackContent}>
              <h2 className={styles.feedbackTitle}>🙏 We Need Your Feedback!</h2>
              <p className={styles.feedbackDescription}>
                As these packages are in extremely early beta, your feedback is invaluable. Help us
                improve by reporting bugs, suggesting features, or sharing your experience.
              </p>
              <div className={styles.feedbackButtons}>
                <Link
                  className="button button--primary button--lg"
                  to="https://github.com/pressw/ai-dev-tooling/issues/new"
                >
                  🐛 Report an Issue
                </Link>
                <Link
                  className="button button--secondary button--lg"
                  to="https://github.com/pressw/ai-dev-tooling/discussions"
                >
                  💬 Join Discussions
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className="container">
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Ready to Build Something Amazing?</h2>
              <p className={styles.ctaDescription}>
                Get started with our comprehensive documentation and examples
              </p>
              <div className={styles.ctaButtons}>
                <Link className="button button--primary button--lg" to="/docs/intro">
                  📚 Browse Documentation
                </Link>
                <Link
                  className="button button--secondary button--lg"
                  to="/docs/typescript/chat-nextjs/examples"
                >
                  💡 View Examples
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
