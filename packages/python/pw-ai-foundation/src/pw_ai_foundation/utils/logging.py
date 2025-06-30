"""Logging configuration utilities."""

import logging
import sys


def configure_logging(
    level: str = "INFO",
    format_string: str | None = None,
) -> None:
    """Configure logging for the SDK.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_string: Custom format string for log messages
    """
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format=format_string,
        handlers=[logging.StreamHandler(sys.stdout)],
    )
