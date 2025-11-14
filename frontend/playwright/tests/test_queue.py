import pytest
from playwright.sync_api import sync_playwright
from faker import Faker
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import random
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from helpers.login import mock_session, login

faker = Faker()

def run():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            
            mock_session(page)
            login(page)
            
            page.goto("http://localhost:3000/terms")
            page.locator("text=Accept & Continue").click()
            username = faker.first_name() + str(random.randint(1000, 9999))
            
            page.locator('input[placeholder="Username *"]').fill(username)
            page.locator('text=Complete Setup').click()
            page.locator("text=Start Matching").click()

            element = page.wait_for_selector("h1:text('AniMatch Chat')", timeout=10000)
            assert element is not None, f"Queue failed for user {username}"
            
            page.wait_for_timeout(3500)
            browser.close()
            return True
        
    except Exception as e:
        return e
    
def test_queue():
    results = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(run) for _ in range(2)]
        for future in as_completed(futures):
            result = future.result()
            results.append(result)

    for res in results:
        if res is not True:
            pytest.fail(f"Test failed: {res}")

            