# PW AI Foundation

Python SDK for PressW AI Foundation.

## Installation

```bash
pip install pw-ai-foundation
```

## Quick Start

```python
from pw_ai_foundation import BaseModel, configure_logging

# Configure logging
configure_logging(level="INFO")

# Use base model
class MyModel(BaseModel):
    name: str
    value: int

model = MyModel(name="example", value=42)
print(model.to_dict())
```

## Development

```bash
# Install with dev dependencies
uv pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy src

# Linting
ruff check .
```
