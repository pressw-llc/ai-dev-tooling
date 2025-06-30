# Contributing to PressW SDK

Thank you for your interest in contributing to the PressW SDK! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/ai-dev-tooling.git`
3. Add the upstream remote: `git remote add upstream https://github.com/pressw/ai-dev-tooling.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- [uv](https://github.com/astral-sh/uv) for Python package management
- [Bun](https://bun.sh) for TypeScript/JavaScript
- [just](https://github.com/casey/just) command runner
- [direnv](https://direnv.net/) for automatic virtual environment activation (optional but recommended)

### Initial Setup

```bash
# Initialize the development environment (includes direnv allow if direnv is installed)
just init

# Install pre-commit hooks
just install-hooks
```

## Making Changes

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that don't affect code meaning
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding or updating tests
- `chore:` Changes to build process or auxiliary tools

Examples:

```
feat: add support for custom models in pw-ai-foundation
fix: resolve memory leak in chat-core client
docs: update installation guide for TypeScript packages
```

### Code Style

#### Python

- We use `ruff` for linting and formatting
- Follow PEP 8 guidelines
- Add type hints to all functions
- Write docstrings for all public APIs

#### TypeScript

- We use ESLint and Prettier
- Use strict TypeScript settings
- Export types alongside implementations
- Document public APIs with JSDoc comments

### Testing

All code changes should include tests:

```bash
# Run all tests
just test

# Run Python tests only
cd packages/python/pw-ai-foundation && uv run pytest

# Run TypeScript tests only
bun test
```

### Documentation

- Update relevant documentation for any API changes
- Add examples for new features
- Keep README files up to date

## Pull Request Process

1. Ensure all tests pass: `just test`
2. Run linters: `just lint`
3. Update documentation if needed
4. Commit your changes with a descriptive commit message
5. Push to your fork: `git push origin feature/your-feature-name`
6. Create a Pull Request from your fork to the main repository

### PR Guidelines

- PRs should focus on a single feature or fix
- Include a clear description of the changes
- Reference any related issues
- Ensure CI passes before requesting review
- Be responsive to review feedback

## Release Process

Releases are managed by maintainers through our automated release process:

1. Changes are merged to main
2. Release bot creates a release PR with version bumps
3. Maintainers review and merge the release PR
4. GitHub Actions automatically publishes to PyPI and npm

## Development Tips

### Working with the Monorepo

```bash
# Build all packages
just build

# Clean all build artifacts
just clean

# Format all code
just format

# Type check everything
just typecheck
```

### Package-Specific Development

#### Python (pw-ai-foundation)

```bash
cd packages/python/pw-ai-foundation
uv pip install -e ".[dev]"
uv run pytest -v
```

#### TypeScript (@pressw/chat-core, @pressw/chat-ui)

```bash
# Install dependencies
bun install

# Build a specific package
cd packages/typescript/chat-core
bun run build

# Run tests with watch mode
bun test --watch
```

## Getting Help

- Check existing issues and PRs before creating new ones
- Join our Discord community for discussions
- Review the documentation at https://pressw.github.io/ai-dev-tooling/

## License

By contributing to PressW SDK, you agree that your contributions will be licensed under the Apache License 2.0.
