"""Base model classes."""

from typing import Any

from pydantic import BaseModel as PydanticBaseModel
from pydantic import ConfigDict


class BaseModel(PydanticBaseModel):
    """Base model with common functionality."""

    model_config = ConfigDict(
        validate_assignment=True,
        use_enum_values=True,
        arbitrary_types_allowed=True,
    )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        return self.model_dump()
