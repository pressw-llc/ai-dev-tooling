"""Test utils module."""

import logging

from pw_ai_foundation.utils import configure_logging


def test_configure_logging(caplog):
    """Test configure_logging function."""
    with caplog.at_level(logging.DEBUG):
        configure_logging(level="DEBUG")

        logger = logging.getLogger("test")
        logger.debug("Debug message")
        logger.info("Info message")

        assert "Debug message" in caplog.text
        assert "Info message" in caplog.text


def test_configure_logging_custom_format():
    """Test configure_logging with custom format."""
    # Reset logging configuration
    logging.getLogger().handlers.clear()

    # Test that function runs without error
    configure_logging(level="INFO", format_string="%(levelname)s: %(message)s")

    # Verify logging level is set correctly
    root_logger = logging.getLogger()
    assert root_logger.level == logging.INFO
