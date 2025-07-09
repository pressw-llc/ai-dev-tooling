---
sidebar_position: 1
---

# Introduction

Welcome to the **PressW SDK** documentation. This monorepo hosts multiple language SDKs for building AI-powered applications.

:::warning Beta Software
These packages are in **extremely early beta**. APIs may change, features may be incomplete, and bugs are expected. We greatly appreciate all feedback and bug reports to help us improve!

**How to provide feedback:**

- 🐛 [Report bugs on GitHub](https://github.com/pressw/ai-dev-tooling/issues/new)
- 💬 [Join discussions](https://github.com/pressw/ai-dev-tooling/discussions)
- ⭐ [Star the repository](https://github.com/pressw/ai-dev-tooling) to show support
  :::

## Available SDKs

### Python SDK (`pw-ai-foundation`)

Our Python SDK provides:

- Foundation models for AI applications
- Utility functions for common tasks
- Dataset management tools
- Type-safe interfaces with Pydantic

### TypeScript SDKs

Our TypeScript packages follow a modular architecture with clear separation of concerns:

#### Core Package

##### `@pressw/threads`

The foundation package providing interfaces and React hooks for thread management:

- Core thread interfaces and types
- React hooks with optimistic updates
- Base adapter pattern for database flexibility
- Multi-tenant support with user context
- Full TypeScript support with Zod validation

#### Database Adapters

##### `@pressw/threads-drizzle`

SQL database adapter for Drizzle ORM:

- Support for PostgreSQL, MySQL, SQLite
- Field mapping for existing schemas
- Transaction support
- Type-safe queries
- Migration utilities

##### `@pressw/threads-langgraph`

Cloud-native adapter for LangGraph Cloud:

- Seamless integration with LangGraph Cloud
- Managed thread storage
- Built-in assistant integration
- No database management required
- Full compatibility with `@pressw/threads` interface

#### UI Components

##### `@pressw/chat-ui`

React components for chat interfaces:

- Pre-built UI components
- Customizable styling
- Integration with threads package

##### `@pressw/chat-nextjs`

Next.js integration utilities:

- Server-side thread management
- API route handlers
- Authentication helpers

## Quick Start

Choose your language to get started:

### Python

```bash
pip install pw-ai-foundation
```

### TypeScript

Install the core package and choose your adapter:

```bash
# Core thread management
bun add @pressw/threads

# Choose a database adapter:
bun add @pressw/threads-drizzle drizzle-orm  # For SQL databases
# OR
bun add @pressw/threads-langgraph @langchain/langgraph-sdk  # For LangGraph Cloud

# Optional UI components
bun add @pressw/chat-ui  # React components
bun add @pressw/chat-nextjs  # Next.js integration
```

## Features

- **Type Safety**: Full type support in both Python and TypeScript
- **Modern Tooling**: Built with uv (Python) and Bun (TypeScript)
- **CI/CD**: Automated testing, linting, and releases
- **Documentation**: Comprehensive docs with API references
- **Open Source**: Apache-2.0 licensed with transparent development

## Contributing

We welcome contributions! Check out the repository for development guidelines and setup instructions.
