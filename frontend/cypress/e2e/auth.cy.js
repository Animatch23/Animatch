describe('Authentication with Google', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display Google login button', () => {
    cy.contains('Login with your DLSU Google Account').should('be.visible');
    cy.get('button').contains('Login with your DLSU Google Account').should('exist');
  });
//this one currently is not implemented yet
  /*it('should redirect to Google OAuth', () => {
    cy.get('button').contains('Login with your DLSU Google Account').click();
    // Google redirect will happen
    cy.url().should('include', 'accounts.google.com');
  });*/

});