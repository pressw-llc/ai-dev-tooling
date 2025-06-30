"""Test models module."""

import pytest
from pw_ai_foundation.models import BaseModel


class TestBaseModel:
    """Test BaseModel class."""

    def test_base_model_creation(self):
        """Test creating a BaseModel instance."""

        class TestModel(BaseModel):
            name: str
            value: int

        model = TestModel(name="test", value=42)
        assert model.name == "test"
        assert model.value == 42

    def test_base_model_to_dict(self):
        """Test converting BaseModel to dict."""

        class TestModel(BaseModel):
            name: str
            value: int

        model = TestModel(name="test", value=42)
        result = model.to_dict()
        assert result == {"name": "test", "value": 42}

    def test_base_model_validation(self):
        """Test BaseModel validation."""

        class TestModel(BaseModel):
            name: str
            value: int

        with pytest.raises(ValueError):
            TestModel(name="test", value="not_an_int")  # type: ignore
