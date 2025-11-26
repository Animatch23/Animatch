
const randomName = Date.now()

describe('Authentication with Google', () => {
  beforeEach(() => {
    cy.login()
    cy.mockSession()
    cy.visit('/terms')
    cy.contains('Accept & Continue').click()
  });

  it('should setup profile', () => {
    cy.get('input[placeholder="Username *"]input').type('randomName')
    cy.contains('Complete Setup').click()
  });
//this one currently is not implemented yet
  /*it('should redirect to Google OAuth', () => {
    cy.get('button').contains('Login with your DLSU Google Account').click();
    // Google redirect will happen
    cy.url().should('include', 'accounts.google.com');
  });*/

});