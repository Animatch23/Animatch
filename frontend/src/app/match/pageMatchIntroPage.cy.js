import React from 'react'
import MatchIntroPage from './page'

describe('<MatchIntroPage />', () => {
  it('should render the match intro page', () => {
    cy.mount(<MatchIntroPage />);
    cy.get('body').should('be.visible');
  });

  it('should display Start Matching button', () => {
    cy.mount(<MatchIntroPage />);
    cy.contains('Start Matching').should('be.visible');
  });

  it('should have select interests button', () => {
    cy.mount(<MatchIntroPage />);
    cy.get('button').should('exist');
  });
});