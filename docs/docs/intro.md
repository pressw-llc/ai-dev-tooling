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

#### `@pressw/threads`

Flexible thread management library for building:

- Conversational interfaces
- Support ticket systems
- Task management
- Discussion forums
- Any threaded data structure

Features include:

- Thread-first architecture
- Database agnostic (PostgreSQL, MySQL, SQLite)
- Multi-tenant support
- React hooks with optimistic updates
- Full TypeScript support with Zod validation

#### `@pressw/threads-langgraph`

LangGraph Cloud adapter for thread management:

- Seamless integration with LangGraph Cloud
- Persistent thread state management
- Built-in conversation history
- Compatible with LangGraph assistants
- Full compatibility with `@pressw/threads` interface

#### `@pressw/chat-ui`

React components for chat interfaces:

- Pre-built UI components
- Customizable styling
- Integration with threads package

## Quick Start

Choose your language to get started:

- **Python**: Install with `pip install pw-ai-foundation`
- **TypeScript**:
  - Thread management: `bun add @pressw/threads`
  - LangGraph integration: `bun add @pressw/threads-langgraph`
  - Chat UI components: `bun add @pressw/chat-ui`

## Features

- **Type Safety**: Full type support in both Python and TypeScript
- **Modern Tooling**: Built with uv (Python) and Bun (TypeScript)
- **CI/CD**: Automated testing, linting, and releases
- **Documentation**: Comprehensive docs with API references
- **Open Source**: Apache-2.0 licensed with transparent development

## Contributing

We welcome contributions! Check out the repository for development guidelines and setup instructions.
