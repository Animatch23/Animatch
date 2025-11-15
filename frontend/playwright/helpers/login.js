// helpers/login.js
import jwt from "jsonwebtoken";
import { faker } from "@faker-js/faker";

// same as Python's SECRET_KEY
const SECRET_KEY = "some_random_secret_key_for_development";

export function generateFakeJwt(email) {
  const payload = {
    sub: "1234567890",
    name: "Test User",
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  return jwt.sign(payload, SECRET_KEY, { algorithm: "HS256" });
}

export function mockSession(page) {
  const email = `test_${faker.person.firstName()}@dlsu.edu.ph`;
  const pendingToken = generateFakeJwt(email);

  return page.addInitScript(`
    sessionStorage.setItem("pendingEmail", "${email}");
    sessionStorage.setItem("pendingToken", "${pendingToken}");
  `);
}

export function login(page, email = null) {
  email = email || `test_${faker.person.firstName()}@dlsu.edu.ph`;
  const sessionToken = generateFakeJwt(email);

  return page.addInitScript(`
    sessionStorage.setItem("sessionToken", "${sessionToken}");
  `);
}
