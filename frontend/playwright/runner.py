import pytest
import os
import sys

tests_dir = os.path.join(os.path.dirname(__file__), "tests")

tests = [
    os.path.join(tests_dir, "test_queue.py")
]

code = 0

for test in tests:
    pytest_cmd = ["-v", test]
    exit_code = pytest.main(pytest_cmd)
    if exit_code != 0:
        code = 1

sys.exit(code)