from playwright.sync_api import Page
import time
import jwt
from faker import Faker

faker = Faker()

SECRET_KEY = "some_random_secret_key_for_development"

def generate_fake_jwt(email):
    payload = {
        "sub": "1234567890",      
        "name": "Test User",
        "email": email,
        "iat": int(time.time()),  
        "exp": int(time.time()) + 3600  
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def mock_session(page: Page):
    email = f"test_{faker.first_name()}@dlsu.edu.ph"
    pending_token = generate_fake_jwt(email)

    page.add_init_script(
        f"""
        sessionStorage.setItem("pendingEmail", "{email}");
        sessionStorage.setItem("pendingToken", "{pending_token}");
        """
    )

def login(page: Page, email: str = None):
    email = f"test_{faker.first_name()}@dlsu.edu.ph"
    session_token = generate_fake_jwt(email)
    page.add_init_script(
        f"""
        sessionStorage.setItem("sessionToken", "{session_token}");
        """
    )
