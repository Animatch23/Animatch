Cypress.Commands.add('uploadFile', (inputSelector, fileName) => {
  cy.get(inputSelector).selectFile(`cypress/fixtures/${fileName}`, { force: true });
});

Cypress.Commands.add('loginWithGoogle', () => {
  cy.intercept('POST', '**/auth/callback/google', {
    statusCode: 200,
    body: { ok: true },
  }).as('googleAuth');

  cy.get('button').contains('Sign in with Google').click();
  cy.wait('@googleAuth');
  cy.url().should('include', '/match');
});