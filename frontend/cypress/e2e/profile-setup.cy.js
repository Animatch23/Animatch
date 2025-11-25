describe('Profile-Setup', () => {
  beforeEach(() => {
    cy.visit('/profile-setup');
  });

  it('Correct name information', () => {
    cy.get('input[placeholder="Username *"]').type('Karl Matthew Dela Cruz');
    cy.uploadFile('input[type="file"]', 'TEST.png', 'image/png');
    cy.get('button').contains('Continue').click();
  });

  it('should display profile setup page', () => {
    cy.contains('Profile Setup').should('be.visible');
    cy.contains("Let's set up your AniMatch profile").should('be.visible');
  });

  it('should upload photo and enter username', () => {
    cy.uploadFile('input[type="file"]', 'TEST.png', 'image/png');
    cy.get('input[placeholder="Username *"]').type('Karl Matthew Dela Cruz');
    cy.get('button').contains('Continue').click();
  });

  it('should show error for username less than 3 characters', () => {
    cy.get('input[placeholder="Username *"]').type('ab');
    cy.get('button').contains('Continue').click();
    cy.contains('Username must be at least 3 characters').should('be.visible');
  });

  it('should disable continue button when username is empty', () => {
    cy.get('button').contains('Continue').should('be.disabled');
  });

  it('should reject invalid file types', () => {
    cy.uploadFile('input[type="file"]', 'testFileFormat.pdf', 'application/pdf');
    cy.contains('Please select a valid image file').should('be.visible');
  });
});