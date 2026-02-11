"""
Simple Python test fixture for funcflow
"""


def main():
    """Main entry point."""
    process_data()
    cleanup()


def process_data():
    """Process data by fetching and transforming it."""
    data = fetch_data()
    transform_data(data)


def fetch_data():
    """Fetch data from source."""
    return {"id": 1, "name": "test"}


def transform_data(data):
    """Transform the input data."""
    return {
        **data,
        "processed": True,
    }


def cleanup():
    """Cleanup resources."""
    pass


def helper_function(x, y):
    """A helper function with multiple parameters."""
    result = calculate(x, y)
    return format_result(result)


def calculate(a, b):
    """Perform calculation."""
    return a + b


def format_result(value):
    """Format the result for display."""
    return f"Result: {value}"
