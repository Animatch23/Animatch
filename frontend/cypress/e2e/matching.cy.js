describe('Matching Feature', () => {
  beforeEach(() => {
    cy.visit('/match', {
      onBeforeLoad(win) {
        win.localStorage.setItem('sessionToken', 'mock-token');
        win.sessionStorage.setItem('pendingEmail', 'test@example.com');
        win.sessionStorage.setItem('pendingToken', 'mock-token');
        win.sessionStorage.setItem('termsAccepted', 'true');
      },
    });
  });

  it('should display match intro page', () => {
    cy.contains('Start Matching').should('be.visible');
    cy.contains('Select Interests').should('be.visible');
  });

  it('should not have hamburger menu button on landing page', () => {
    cy.get('button[aria-label="Open saved chats"]').should('not.exist');
  });

  it('should navigate to queue on Start Matching click', () => {
    cy.contains('a', 'Start Matching')
      .should('have.attr', 'href', '/match/queue')
      .click({ force: true });
    cy.url().should('include', '/match/queue');
  });

  it('should navigate to profile setup on Select Interests click', () => {
    cy.contains('a', 'Select Interests').click();
    cy.url().should('include', '/profile-setup');
  });

});