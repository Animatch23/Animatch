import pytest
from playwright.sync_api import sync_playwright
from faker import Faker
from concurrent.futures import ThreadPoolExecutor
import sys
import random
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from helpers.login import mock_session, login

faker = Faker()

def run():
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

        page.wait_for_selector("h1:text('AniMatch Chat')", timeout=15000)
        
        page.wait_for_timeout(5000)
        browser.close()
        return True

def test_queue():
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = results = list(executor.map(lambda _: run(), range(2)))
    assert all(results)
            