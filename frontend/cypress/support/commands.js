Cypress.Commands.add('uploadFile', (inputSelector, fileName) => {
  cy.get(inputSelector).selectFile(`cypress/fixtures/${fileName}`, { force: true });
});


const randomEmail = `test_${Date.now()}@dlsu.edu.ph`

// cypress/support/commands.js


// cypress/support/commands.js
Cypress.Commands.add("mockSession", (email = randomEmail, token = "some_random_secret_key_for_development") => {
  cy.window().then((win) => {
    win.sessionStorage.setItem("pendingEmail", email);
    win.sessionStorage.setItem("pendingToken", token);
  });
});
// cypress/support/commands.js
Cypress.Commands.add("login", () => {
  // Either mock token or get from a fixture / environment variable
  const fakeToken = "some_random_secret_key_for_development"; 

  // Set it directly into localStorage before visiting
  cy.window().then((win) => {
    win.localStorage.setItem("sessionToken", fakeToken);
  });
});


// ...existing code...
Cypress.Commands.add('completeProfileSetup', (username) => {
  const uniqueEmail = `test_${Date.now()}_${Cypress._.random(1e9)}@dlsu.edu.ph`;
  const uniqueUsername = username || `user_${Date.now()}_${Cypress._.random(1e4)}`;

  cy.login();
  cy.mockSession(uniqueEmail);

  cy.visit('/terms');
  cy.contains('Accept & Continue').click();

  cy.get('input[placeholder="Username *"]').type(uniqueUsername);
  cy.get('button').contains('Complete Setup').click();
});
// ...existing code...



