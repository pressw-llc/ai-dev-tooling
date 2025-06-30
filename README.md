# PressW SDK Monorepo

[![CI](https://github.com/pressw/ai-dev-tooling/actions/workflows/ci.yml/badge.svg)](https://github.com/pressw/ai-dev-tooling/actions/workflows/ci.yml)
[![Python](https://img.shields.io/pypi/v/pw-ai-foundation.svg)](https://pypi.org/project/pw-ai-foundation/)
[![npm](https://img.shields.io/npm/v/@pressw/chat-core.svg)](https://www.npmjs.com/package/@pressw/chat-core)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Multi-language SDK monorepo for building AI-powered applications.

## 📦 Packages

### Python

- **`pw-ai-foundation`** - Foundation SDK with models, utilities, and datasets

### TypeScript

- **`@pressw/chat-core`** - Core chat functionality
- **`@pressw/chat-ui`** - React UI components for chat interfaces

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- [uv](https://github.com/astral-sh/uv) for Python package management
- [Bun](https://bun.sh) for TypeScript/JavaScript
- [direnv](https://direnv.net/) for automatic virtual environment activation (optional but recommended)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/pressw/ai-dev-tooling.git
cd ai-dev-tooling

# Install just (command runner)
# macOS: brew install just
# Linux: See https://github.com/casey/just

# Install direnv for auto-activation (optional but recommended)
# macOS: brew install direnv
# Then add to your shell: https://direnv.net/docs/hook.html

# Initialize development environment (includes direnv allow if direnv is installed)
just init

# Run tests
just test

# Run linters
just lint
```

## 📖 Documentation

Full documentation is available at [https://pressw.github.io/ai-dev-tooling/](https://pressw.github.io/ai-dev-tooling/)

### Package-specific docs:

- [Python SDK Documentation](./packages/python/pw-ai-foundation/README.md)
- [TypeScript Chat Core Documentation](./packages/typescript/chat-core/README.md)
- [TypeScript Chat UI Documentation](./packages/typescript/chat-ui/README.md)

## 🛠️ Development

### Available Commands

```bash
just              # Show all available commands
just init         # Initialize development environment
just test         # Run all tests
just lint         # Run linters
just typecheck    # Run type checkers
just build        # Build all packages
just clean        # Clean build artifacts
```

### Project Structure

```
.
├── packages/
│   ├── python/
│   │   └── pw-ai-foundation/     # Python SDK
│   └── typescript/
│       ├── chat-core/            # Core chat functionality
│       └── chat-ui/              # React UI components
├── docs/                         # Docusaurus documentation
├── tools/                        # Build and release scripts
└── .github/                      # GitHub Actions workflows
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`just test`)
5. Commit with conventional commits (`feat:`, `fix:`, etc.)
6. Push to your fork
7. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/pressw/ai-dev-tooling)
- [Python Package (PyPI)](https://pypi.org/project/pw-ai-foundation/)
- [TypeScript Packages (npm)](https://www.npmjs.com/org/pressw)
- [Documentation](https://pressw.github.io/ai-dev-tooling/)
- [Issue Tracker](https://github.com/pressw/ai-dev-tooling/issues)

## 🏗️ Roadmap

- [ ] MCP (Model Context Protocol) package
- [ ] Additional language SDKs (Rust, Go)
- [ ] OpenTelemetry integration
- [ ] Enhanced testing utilities
- [ ] CLI tools for code generation

---

Made with ❤️ by the PressW Team
