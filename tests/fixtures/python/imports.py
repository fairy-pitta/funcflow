"""
Python test fixture demonstrating various import patterns
"""

import os
import json
from typing import Dict, List, Optional
from pathlib import Path
from dataclasses import dataclass

# Relative imports (for module structure testing)
# from .simple import fetch_data, transform_data
# from .classes import UserService, User


@dataclass
class Config:
    """Configuration dataclass."""
    name: str
    value: str
    enabled: bool = True


def load_config(path: str) -> Config:
    """Load configuration from a JSON file."""
    content = read_file(path)
    data = parse_json(content)
    return create_config(data)


def read_file(path: str) -> str:
    """Read file contents."""
    file_path = Path(path)
    return file_path.read_text()


def parse_json(content: str) -> Dict:
    """Parse JSON content."""
    return json.loads(content)


def create_config(data: Dict) -> Config:
    """Create a Config object from dictionary."""
    return Config(
        name=data.get("name", "default"),
        value=data.get("value", ""),
        enabled=data.get("enabled", True),
    )


def save_config(config: Config, path: str) -> None:
    """Save configuration to a JSON file."""
    data = serialize_config(config)
    content = json.dumps(data, indent=2)
    write_file(path, content)


def serialize_config(config: Config) -> Dict:
    """Serialize Config to dictionary."""
    return {
        "name": config.name,
        "value": config.value,
        "enabled": config.enabled,
    }


def write_file(path: str, content: str) -> None:
    """Write content to file."""
    file_path = Path(path)
    file_path.write_text(content)


def get_env_config() -> Optional[Config]:
    """Get configuration from environment variables."""
    name = os.getenv("CONFIG_NAME")
    value = os.getenv("CONFIG_VALUE")

    if name and value:
        return Config(name=name, value=value)
    return None


def merge_configs(configs: List[Config]) -> Config:
    """Merge multiple configurations."""
    if not configs:
        return create_default_config()

    base = configs[0]
    for config in configs[1:]:
        base = merge_two_configs(base, config)

    return base


def create_default_config() -> Config:
    """Create a default configuration."""
    return Config(name="default", value="", enabled=False)


def merge_two_configs(a: Config, b: Config) -> Config:
    """Merge two configurations, b takes precedence."""
    return Config(
        name=b.name or a.name,
        value=b.value or a.value,
        enabled=b.enabled,
    )
