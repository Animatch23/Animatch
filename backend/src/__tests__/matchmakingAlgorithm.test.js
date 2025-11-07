import { 
  calculateSimilarityScore, 
  findBestMatch, 
  getMatchingStrategy 
} from '../utils/matchmakingAlgorithm.js';

describe('Matchmaking Algorithm Tests', () => {
  
  describe('calculateSimilarityScore', () => {
    
    test('should return 0 for users with no common interests', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };
      const user2 = {
        course: 'Business',
        dorm: 'Dorm B',
        organizations: ['Chess Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(0);
    });

    test('should award 3 points for matching course', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: 'Computer Science',
        dorm: 'Dorm B',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(3);
    });

    test('should award 2 points for matching dorm', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: 'Business',
        dorm: 'Dorm A',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2);
    });

    test('should award 1 point per shared organization', () => {
      const user1 = {
        course: null,
        dorm: null,
        organizations: ['Anime Club', 'Gaming Society', 'Tech Club']
      };
      const user2 = {
        course: null,
        dorm: null,
        organizations: ['Anime Club', 'Gaming Society']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2); // 2 shared organizations
    });

    test('should calculate cumulative score for multiple matches', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club', 'Gaming Society']
      };
      const user2 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club', 'Tech Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6); // 3 (course) + 2 (dorm) + 1 (org)
    });

    test('should be case-insensitive for course matching', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: null,
        organizations: []
      };
      const user2 = {
        course: 'computer science',
        dorm: null,
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(3);
    });

    test('should be case-insensitive for dorm matching', () => {
      const user1 = {
        course: null,
        dorm: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: null,
        dorm: 'dorm a',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2);
    });

    test('should be case-insensitive for organization matching', () => {
      const user1 = {
        course: null,
        dorm: null,
        organizations: ['Anime Club', 'Gaming Society']
      };
      const user2 = {
        course: null,
        dorm: null,
        organizations: ['anime club', 'GAMING SOCIETY']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2);
    });

    test('should handle null/undefined interests gracefully', () => {
      const user1 = {
        course: null,
        dorm: undefined,
        organizations: null
      };
      const user2 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle empty organizations array', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(5); // 3 (course) + 2 (dorm)
    });

    test('should handle completely null user interests', () => {
      const score = calculateSimilarityScore(null, null);
      expect(score).toBe(0);
    });

    test('should handle undefined user interests', () => {
      const score = calculateSimilarityScore(undefined, undefined);
      expect(score).toBe(0);
    });
  });

  describe('findBestMatch', () => {
    
    test('should return null when no candidates are available', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const result = findBestMatch(userInterests, []);
      expect(result).toBeNull();
    });

    test('should return the only candidate when there is one', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: {
            course: 'Business',
            dorm: 'Dorm B',
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userInterests, candidates);
      expect(result).toBe(candidates[0]);
    });

    test('should prefer candidate with highest similarity score', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: {
            course: 'Business',
            dorm: 'Dorm B',
            organizations: []
          }
        },
        {
          userId: 'user3',
          interests: {
            course: 'Computer Science',
            dorm: 'Dorm A',
            organizations: ['Anime Club']
          }
        },
        {
          userId: 'user4',
          interests: {
            course: 'Computer Science',
            dorm: 'Dorm B',
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userInterests, candidates);
      expect(result.userId).toBe('user3'); // Perfect match
    });

    test('should use similarity-based matching when score meets threshold', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: null,
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: {
            course: 'Computer Science',
            dorm: null,
            organizations: []
          }
        },
        {
          userId: 'user3',
          interests: {
            course: 'Business',
            dorm: null,
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userInterests, candidates, 1);
      expect(result.userId).toBe('user2'); // Should pick the one with matching course
    });

    test('should fallback to random when no candidate meets threshold', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: {
            course: 'Business',
            dorm: 'Dorm B',
            organizations: ['Chess Club']
          }
        },
        {
          userId: 'user3',
          interests: {
            course: 'Engineering',
            dorm: 'Dorm C',
            organizations: ['Sports Club']
          }
        }
      ];
      
      // With no matches, should return a random candidate
      const result = findBestMatch(userInterests, candidates, 1);
      expect(result).toBeDefined();
      expect(['user2', 'user3']).toContain(result.userId);
    });

    test('should handle custom similarity threshold', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: null,
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: {
            course: 'Computer Science',
            dorm: null,
            organizations: []
          }
        }
      ];
      
      // Threshold of 5 should not be met (score is 3)
      const result = findBestMatch(userInterests, candidates, 5);
      expect(result).toBeDefined();
      // Should still return the candidate, but via random fallback
    });

    test('should handle candidates with null interests', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: null
        },
        {
          userId: 'user3',
          interests: {
            course: null,
            dorm: null,
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userInterests, candidates);
      expect(result).toBeDefined();
      expect(['user2', 'user3']).toContain(result.userId);
    });

    test('should consistently pick best match with multiple high-scoring candidates', () => {
      const userInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          interests: {
            course: 'Computer Science',
            dorm: 'Dorm A',
            organizations: []
          }
        },
        {
          userId: 'user3',
          interests: {
            course: 'Computer Science',
            dorm: 'Dorm B',
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userInterests, candidates);
      // user2 has score of 5 (course + dorm), user3 has score of 3 (course only)
      expect(result.userId).toBe('user2');
    });
  });

  describe('getMatchingStrategy', () => {
    
    test('should return "similarity-based" when score meets threshold', () => {
      expect(getMatchingStrategy(3, 1)).toBe('similarity-based');
      expect(getMatchingStrategy(5, 3)).toBe('similarity-based');
      expect(getMatchingStrategy(1, 1)).toBe('similarity-based');
    });

    test('should return "random-fallback" when score is below threshold', () => {
      expect(getMatchingStrategy(0, 1)).toBe('random-fallback');
      expect(getMatchingStrategy(2, 3)).toBe('random-fallback');
    });

    test('should use default threshold of 1', () => {
      expect(getMatchingStrategy(0)).toBe('random-fallback');
      expect(getMatchingStrategy(1)).toBe('similarity-based');
      expect(getMatchingStrategy(2)).toBe('similarity-based');
    });
  });

  describe('Edge Cases and Integration', () => {
    
    test('should handle large number of organizations', () => {
      const user1 = {
        course: null,
        dorm: null,
        organizations: Array(20).fill(0).map((_, i) => `Org${i}`)
      };
      const user2 = {
        course: null,
        dorm: null,
        organizations: Array(20).fill(0).map((_, i) => `Org${i}`)
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(20); // All 20 organizations match
    });

    test('should handle special characters in interests', () => {
      const user1 = {
        course: 'Computer Science & Engineering',
        dorm: 'St. Mary\'s Dorm',
        organizations: ['Anime & Manga Club']
      };
      const user2 = {
        course: 'Computer Science & Engineering',
        dorm: 'St. Mary\'s Dorm',
        organizations: ['Anime & Manga Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6); // 3 + 2 + 1
    });

    test('should handle unicode characters in interests', () => {
      const user1 = {
        course: 'アニメ Studies',
        dorm: 'Дorm A',
        organizations: ['日本 Club']
      };
      const user2 = {
        course: 'アニメ Studies',
        dorm: 'Дorm A',
        organizations: ['日本 Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6);
    });

    test('should handle whitespace variations in interests', () => {
      const user1 = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };
      const user2 = {
        course: ' Computer Science ',
        dorm: ' Dorm A ',
        organizations: [' Anime Club ']
      };
      
      // Note: Current implementation doesn't trim whitespace
      // This test documents the current behavior
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(0); // Whitespace causes mismatch
    });
  });
});
