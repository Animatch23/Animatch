import { 
  calculateSimilarityScore, 
  findBestMatch, 
  getMatchingStrategy 
} from '../utils/matchmakingAlgorithm.js';

describe('Matchmaking Algorithm Tests', () => {
  
  describe('calculateSimilarityScore', () => {
    
    test('should return 0 for users with no common profile data', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
      };
      const user2 = {
        course: 'Business',
        housing: 'Dorm B',
        organizations: ['Chess Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(0);
    });

    test('should award 3 points for matching course', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Dorm B',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(3);
    });

    test('should award 2 points for matching housing', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: 'Business',
        housing: 'Dorm A',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2);
    });

    test('should award 1 point per shared organization', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['Anime Club', 'Gaming Society', 'Tech Club']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['Anime Club', 'Gaming Society']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2); // 2 shared organizations
    });

    test('should calculate cumulative score for multiple matches', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club', 'Gaming Society']
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club', 'Tech Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6); // 3 (course) + 2 (housing) + 1 (org)
    });

    test('should be case-insensitive for course matching', () => {
      const user1 = {
        course: 'Computer Science',
        housing: null,
        organizations: []
      };
      const user2 = {
        course: 'computer science',
        housing: null,
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(3);
    });

    test('should be case-insensitive for housing matching', () => {
      const user1 = {
        course: null,
        housing: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: null,
        housing: 'dorm a',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2);
    });

    test('should be case-insensitive for organization matching', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['Anime Club', 'Gaming Society']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['anime club', 'GAMING SOCIETY']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(2);
    });

    test('should handle null/undefined profile data gracefully', () => {
      const user1 = {
        course: null,
        housing: undefined,
        organizations: null
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle empty organizations array', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(5); // 3 (course) + 2 (housing)
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
      const userProfile = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const result = findBestMatch(userProfile, []);
      expect(result).toBeNull();
    });

    test('should return the only candidate when there is one', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: {
            course: 'Business',
            housing: 'Dorm B',
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userProfile, candidates);
      expect(result).toBe(candidates[0]);
    });

    test('should prefer candidate with highest similarity score', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: {
            course: 'Business',
            housing: 'Dorm B',
            organizations: []
          }
        },
        {
          userId: 'user3',
          profileData: {
            course: 'Computer Science',
            housing: 'Dorm A',
            organizations: ['Anime Club']
          }
        },
        {
          userId: 'user4',
          profileData: {
            course: 'Computer Science',
            housing: 'Dorm B',
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userProfile, candidates);
      expect(result.userId).toBe('user3'); // Perfect match
    });

    test('should use similarity-based matching when score meets threshold', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: null,
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: {
            course: 'Computer Science',
            housing: null,
            organizations: []
          }
        },
        {
          userId: 'user3',
          profileData: {
            course: 'Business',
            housing: null,
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userProfile, candidates, 1);
      expect(result.userId).toBe('user2'); // Should pick the one with matching course
    });

    test('should fallback to random when no candidate meets threshold', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: {
            course: 'Business',
            housing: 'Dorm B',
            organizations: ['Chess Club']
          }
        },
        {
          userId: 'user3',
          profileData: {
            course: 'Engineering',
            housing: 'Dorm C',
            organizations: ['Sports Club']
          }
        }
      ];
      
      // With no matches, should return a random candidate
      const result = findBestMatch(userProfile, candidates, 1);
      expect(result).toBeDefined();
      expect(['user2', 'user3']).toContain(result.userId);
    });

    test('should handle custom similarity threshold', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: null,
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: {
            course: 'Computer Science',
            housing: null,
            organizations: []
          }
        }
      ];
      
      // Threshold of 5 should not be met (score is 3)
      const result = findBestMatch(userProfile, candidates, 5);
      expect(result).toBeDefined();
      // Should still return the candidate, but via random fallback
    });

    test('should handle candidates with null profileData', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: null
        },
        {
          userId: 'user3',
          profileData: {
            course: null,
            housing: null,
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userProfile, candidates);
      expect(result).toBeDefined();
      expect(['user2', 'user3']).toContain(result.userId);
    });

    test('should consistently pick best match with multiple high-scoring candidates', () => {
      const userProfile = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: []
      };
      
      const candidates = [
        {
          userId: 'user2',
          profileData: {
            course: 'Computer Science',
            housing: 'Dorm A',
            organizations: []
          }
        },
        {
          userId: 'user3',
          profileData: {
            course: 'Computer Science',
            housing: 'Dorm B',
            organizations: []
          }
        }
      ];
      
      const result = findBestMatch(userProfile, candidates);
      // user2 has score of 5 (course + housing), user3 has score of 3 (course only)
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
        housing: null,
        organizations: Array(20).fill(0).map((_, i) => `Org${i}`)
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: Array(20).fill(0).map((_, i) => `Org${i}`)
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(20); // All 20 organizations match
    });

    test('should handle special characters in profile data', () => {
      const user1 = {
        course: 'Computer Science & Engineering',
        housing: 'St. Mary\'s Dorm',
        organizations: ['Anime & Manga Club']
      };
      const user2 = {
        course: 'Computer Science & Engineering',
        housing: 'St. Mary\'s Dorm',
        organizations: ['Anime & Manga Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6); // 3 + 2 + 1
    });

    test('should handle unicode characters in profile data', () => {
      const user1 = {
        course: 'アニメ Studies',
        housing: 'Дorm A',
        organizations: ['日本 Club']
      };
      const user2 = {
        course: 'アニメ Studies',
        housing: 'Дorm A',
        organizations: ['日本 Club']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6);
    });

    test('should handle whitespace variations in profile data', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Dorm A',
        organizations: ['Anime Club']
      };
      const user2 = {
        course: ' Computer Science ',
        housing: ' Dorm A ',
        organizations: [' Anime Club ']
      };
      
      const score = calculateSimilarityScore(user1, user2);
      expect(score).toBe(6); // Whitespace should be ignored
    });
  });
});
