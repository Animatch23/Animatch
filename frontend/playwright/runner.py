import pytest
import os

tests_dir = os.path.join(os.path.dirname(__file__), "tests")

tests = [
    os.path.join(tests_dir, "test_queue.py")
]

for test in tests:
    pytest_cmd = ["-v", test]
    exit_code = pytest.main(pytest_cmd)
        