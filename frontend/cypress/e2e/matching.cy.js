describe('Matching Feature', () => {
  beforeEach(() => {
    cy.completeProfileSetup()
  });

  it('should display match intro page', () => {
    cy.contains('Start Matching').should('be.visible');
    cy.contains('Select Interests').should('be.visible');
  });

  it('should have hamburger menu button', () => {
    cy.get('button[aria-label="Open saved chats sidebar"]').should('be.visible');
  });

  it('should navigate to queue on Start Matching click', () => {
    cy.contains('a', 'Start Matching').click();
    cy.url().should('include', '/match/queue');
  });


  it('shows Terms & Conditions modal when clicked and can close it', () => {
    cy.contains('button', 'View Terms & Conditions').click();
    // Assert modal appears
    cy.get('h2').contains('Terms and Conditions').should('be.visible');
    // Optional: backdrop check
    cy.get('.fixed.inset-0').should('exist');
    // Close via X button
    cy.get('button[aria-label="Close modal"]').click();

    // Reopen and close by clicking backdrop
    cy.contains('button', 'View Terms & Conditions').click();
    cy.get('h2').contains('Terms and Conditions').should('be.visible');
    cy.get('.fixed.inset-0').click('topLeft');
    //test
  });

});