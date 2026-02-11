"""
Python test fixture with classes and methods for funcflow
"""

from typing import Optional, List


class User:
    """Represents a user in the system."""

    def __init__(self, user_id: str, name: str):
        self.id = user_id
        self.name = name


class UserService:
    """Service for managing users."""

    def __init__(self):
        self.users: List[User] = []

    def get_user(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        return self._find_user_by_id(user_id)

    def _find_user_by_id(self, user_id: str) -> Optional[User]:
        """Internal method to find user by ID."""
        for user in self.users:
            if user.id == user_id:
                return user
        return None

    def create_user(self, name: str) -> User:
        """Create a new user."""
        user_id = generate_id()
        user = User(user_id, name)
        self.users.append(user)
        self._notify_user_created(user)
        return user

    def _notify_user_created(self, user: User) -> None:
        """Send notification when user is created."""
        send_notification(f"User {user.name} created")

    def delete_user(self, user_id: str) -> bool:
        """Delete a user by ID."""
        user = self._find_user_by_id(user_id)
        if user:
            self.users.remove(user)
            log_action("delete", user_id)
            return True
        return False


class DataProcessor:
    """Process data with various transformations."""

    def __init__(self, service: UserService):
        self.service = service

    def process(self, data: dict) -> dict:
        """Main processing method."""
        validated = self.validate(data)
        transformed = self.transform(validated)
        return self.finalize(transformed)

    def validate(self, data: dict) -> dict:
        """Validate input data."""
        if not data:
            raise ValueError("Data cannot be empty")
        return data

    def transform(self, data: dict) -> dict:
        """Transform data."""
        result = apply_transformation(data)
        return result

    def finalize(self, data: dict) -> dict:
        """Finalize the processed data."""
        return {"status": "complete", "data": data}


# Utility functions
def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


def send_notification(message: str) -> None:
    """Send a notification message."""
    log_message(f"NOTIFICATION: {message}")


def log_message(message: str) -> None:
    """Log a message."""
    pass


def log_action(action: str, target: str) -> None:
    """Log an action."""
    log_message(f"ACTION: {action} on {target}")


def apply_transformation(data: dict) -> dict:
    """Apply transformation to data."""
    return {k: v for k, v in data.items()}


# Async functions
async def async_fetch_user(user_id: str) -> Optional[User]:
    """Asynchronously fetch a user."""
    result = await fetch_from_database(user_id)
    return process_user_result(result)


async def fetch_from_database(user_id: str) -> dict:
    """Fetch data from database."""
    return {"id": user_id, "name": "async_user"}


def process_user_result(result: dict) -> Optional[User]:
    """Process the user result from database."""
    if result:
        return User(result["id"], result["name"])
    return None
