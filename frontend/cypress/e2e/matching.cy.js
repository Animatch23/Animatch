describe('Matching Feature', () => {
  beforeEach(() => {
    cy.visit('/match');
  });

  it('should display match intro page', () => {
    cy.contains('Start Matching').should('be.visible');
    cy.contains('Select Interests').should('be.visible');
  });

  it('should navigate to queue on Start Matching click', () => {
    cy.contains('a', 'Start Matching').click();
    cy.url().should('include', '/match/queue');
  });

  it('should navigate to interests page on Select Interests click', () => {
    cy.contains('a', 'Select Interests').click();
    cy.url().should('include', '/profile/interests');
  });

});