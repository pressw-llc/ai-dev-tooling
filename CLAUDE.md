# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the AI Dev Tooling monorepo, hosting multi-language SDKs for building AI-powered applications. It contains both Python and TypeScript packages under the Apache 2.0 license.

## Essential Commands

### Development Setup

```bash
# Initialize development environment (creates individual venvs for each Python package, installs dependencies)
just init

# Initialize a specific Python package only
just init-python-package pw-ai-foundation

# Install pre-commit hooks
just install-hooks

# Note: direnv allow is automatically run during init if direnv is installed
```

### Testing

```bash
# Run all tests (Python + TypeScript)
just test

# Run Python tests only
cd packages/python/pw-ai-foundation && uv run pytest

# Run specific Python test
cd packages/python/pw-ai-foundation && uv run pytest tests/test_models.py::TestBaseModel::test_base_model_creation

# Run TypeScript tests
bun test

# Run specific TypeScript test file
bun test packages/typescript/chat-core/test/client.test.ts
```

### Code Quality

```bash
# Run all linters with auto-fix
just lint

# Run type checking
just typecheck

# Format all code
just format

# Run pre-commit on all files
just pre-commit

# Check Python code without fixing
cd packages/python/pw-ai-foundation && uv run ruff check .

# Check TypeScript code without fixing
bunx eslint . --max-warnings 0
```

### Building and Publishing

```bash
# Build all packages
just build

# Build Python package only
cd packages/python/pw-ai-foundation && uv build

# Build TypeScript packages
bun run build

# Clean all build artifacts
just clean

# Clean only Python virtual environments
just clean-python-venvs
```

### Documentation

```bash
# Serve docs locally (Docusaurus)
just docs-serve

# Build documentation
just docs-build
```

## Architecture Overview

### Monorepo Structure

- **Language Separation**: Python and TypeScript packages are completely separate, each with their own toolchain
- **Independent Versioning**: Each package has its own version number and release cycle
- **Shared CI/CD**: GitHub Actions workflows use path filtering to run only relevant checks

### Package Management

- **Python**: Uses `uv` for fast dependency management and `hatchling` as build backend
  - Each Python package has its own isolated `.venv` directory
  - Virtual environments are created per-package for dependency isolation
  - **direnv** integration for automatic venv activation when `cd`ing into package directories
- **TypeScript**: Uses `bun` for package management and building, with workspace protocol for internal dependencies
- **Version Source of Truth**:
  - Python: `src/pw_ai_foundation/__init__.py:__version__`
  - TypeScript: `package.json:version`

### CI/CD Pipeline

- **Path-filtered Matrix**: CI only runs tests for changed packages
- **Release Strategy**: Tag-based releases (format: `package-name-vX.Y.Z`)
- **Automated Publishing**: Merging release PRs triggers PyPI/npm publishing
- **Required Checks**: `lint`, `type-check`, and `test` must pass before merge

### Development Workflow

1. **Commits**: Must follow Conventional Commits format (`feat:`, `fix:`, etc.)
2. **Pre-commit Hooks**: Automatically run ruff, prettier, and commitizen
3. **Release Process**:
   - Bot detects changes and calculates version bumps
   - Creates release PR with updated versions and changelogs
   - Merge triggers automated publishing

### TypeScript Package Dependencies

- `@pressw/chat-ui` depends on `@pressw/chat-core` via workspace protocol
- Both packages are built with bun and target React 18+

### Python Package Structure

- Uses `src` layout with `pw_ai_foundation` as the main module
- Submodules: `models/`, `utils/`, `datasets/` (planned)
- Type hints required, validated with mypy in strict mode

## Key Configuration Files

- **`justfile`**: Central command runner for all development tasks
- **`.pre-commit-config.yaml`**: Automated code quality checks
- **`.czrc`**: Commitizen config for version bumping and changelog generation
- **`pyproject.toml`**: Python package configuration with ruff/mypy settings
- **`tsconfig.json`**: Root TypeScript config with project references
