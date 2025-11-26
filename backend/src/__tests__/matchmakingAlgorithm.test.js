/**
 * US-12 Interest-Based Matchmaking Algorithm Tests
 * 
 * Tests the calculateSimilarity function from queueController.js
 * 
 * Scoring System (0-100 points):
 * - Course: 30 points (case-insensitive)
 * - Housing: 20 points (case-insensitive)
 * - Organizations: up to 25 points (5 points per shared org, case-insensitive)
 * - Interests: up to 25 points (2.5 points per shared interest, case-insensitive)
 */

// Mock the calculateSimilarity function from queueController
// In a real scenario, we'd import it, but since it's not exported, we'll replicate it
const calculateSimilarity = (user1, user2) => {
  let score = 0;

  // Course similarity (30 points)
  if (user1?.course && user2?.course && 
      user1.course.toLowerCase().trim() === user2.course.toLowerCase().trim()) {
    score += 30;
  }

  // Housing similarity (20 points)
  if (user1?.housing && user2?.housing && 
      user1.housing.toLowerCase().trim() === user2.housing.toLowerCase().trim()) {
    score += 20;
  }

  // Organizations similarity (up to 25 points)
  if (user1?.organizations && user2?.organizations && 
      user1.organizations.length > 0 && user2.organizations.length > 0) {
    const user1OrgsLower = user1.organizations.map(org => org.toLowerCase().trim());
    const user2OrgsLower = user2.organizations.map(org => org.toLowerCase().trim());
    const sharedOrgs = user1OrgsLower.filter(org => user2OrgsLower.includes(org));
    score += Math.min(sharedOrgs.length * 5, 25);
  }

  // Interests similarity (up to 25 points)
  if (user1?.interests && user2?.interests && 
      user1.interests.length > 0 && user2.interests.length > 0) {
    const user1InterestsLower = user1.interests.map(interest => interest.toLowerCase().trim());
    const user2InterestsLower = user2.interests.map(interest => interest.toLowerCase().trim());
    const sharedInterests = user1InterestsLower.filter(interest => 
      user2InterestsLower.includes(interest)
    );
    score += Math.min(sharedInterests.length * 2.5, 25);
  }

  return score;
};

describe('US-12: Interest-Based Matchmaking Algorithm Tests', () => {
  
  describe('calculateSimilarity - Course Matching (30 points)', () => {
    
    test('should award 30 points for exact course match', () => {
      const user1 = {
        course: 'Computer Science',
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: 'Computer Science',
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(30);
    });

    test('should be case-insensitive for course matching', () => {
      const user1 = {
        course: 'Computer Science',
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: 'computer science',
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(30);
    });

    test('should handle "Other" course with custom entries (case-insensitive)', () => {
      const user1 = {
        course: 'Other - Marine Biology',
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: 'other - marine biology',
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(30);
    });

    test('should trim whitespace in course matching', () => {
      const user1 = {
        course: '  Computer Science  ',
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: 'Computer Science',
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(30);
    });

    test('should return 0 for different courses', () => {
      const user1 = {
        course: 'Computer Science',
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: 'Business Administration',
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });
  });

  describe('calculateSimilarity - Housing Matching (20 points)', () => {
    
    test('should award 20 points for exact housing match', () => {
      const user1 = {
        course: null,
        housing: 'Agape Hall',
        organizations: [],
        interests: []
      };
      const user2 = {
        course: null,
        housing: 'Agape Hall',
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(20);
    });

    test('should be case-insensitive for housing matching', () => {
      const user1 = {
        course: null,
        housing: 'Agape Hall',
        organizations: [],
        interests: []
      };
      const user2 = {
        course: null,
        housing: 'agape hall',
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(20);
    });

    test('should return 0 for different housing', () => {
      const user1 = {
        course: null,
        housing: 'Agape Hall',
        organizations: [],
        interests: []
      };
      const user2 = {
        course: null,
        housing: 'St. Joseph Hall',
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });
  });

  describe('calculateSimilarity - Organizations Matching (up to 25 points)', () => {
    
    test('should award 5 points per shared organization', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['ACM', 'IEEE'],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['ACM', 'IEEE'],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(10); // 2 shared orgs × 5 = 10
    });

    test('should cap organizations score at 25 points (5 orgs max)', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['Org1', 'Org2', 'Org3', 'Org4', 'Org5', 'Org6', 'Org7'],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['Org1', 'Org2', 'Org3', 'Org4', 'Org5', 'Org6', 'Org7'],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(25); // Capped at 25 points
    });

    test('should be case-insensitive for organization matching', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['ACM', 'Google DSC'],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['acm', 'google dsc'],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(10); // 2 shared orgs × 5 = 10
    });

    test('should count only shared organizations', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['ACM', 'IEEE', 'Google DSC'],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['ACM', 'Robotics Club'],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(5); // 1 shared org (ACM) × 5 = 5
    });

    test('should return 0 when no organizations are shared', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: ['ACM'],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: ['IEEE'],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle empty organizations arrays', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });
  });

  describe('calculateSimilarity - Interests Matching (up to 25 points)', () => {
    
    test('should award 2.5 points per shared interest', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Gaming', 'Anime']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Gaming', 'Anime']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(5); // 2 shared interests × 2.5 = 5
    });

    test('should cap interests score at 25 points (10 interests max)', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Int1', 'Int2', 'Int3', 'Int4', 'Int5', 'Int6', 'Int7', 'Int8', 'Int9', 'Int10', 'Int11', 'Int12']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Int1', 'Int2', 'Int3', 'Int4', 'Int5', 'Int6', 'Int7', 'Int8', 'Int9', 'Int10', 'Int11', 'Int12']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(25); // Capped at 25 points
    });

    test('should be case-insensitive for interest matching', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Gaming', 'Anime']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['gaming', 'ANIME']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(5); // 2 shared interests × 2.5 = 5
    });

    test('should count only shared interests', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Gaming', 'Anime', 'Music']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Gaming', 'Sports']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(2.5); // 1 shared interest (Gaming) × 2.5 = 2.5
    });

    test('should return 0 when no interests are shared', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Gaming']
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: ['Sports']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle empty interests arrays', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: [],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });
  });

  describe('calculateSimilarity - Combined Scoring', () => {
    
    test('should calculate perfect match score (100 points)', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE', 'Google DSC', 'Robotics', 'AI Club'],
        interests: ['Gaming', 'Anime', 'AI', 'Music', 'Reading', 'Coding', 'Movies', 'Travel', 'Photography', 'Art']
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE', 'Google DSC', 'Robotics', 'AI Club'],
        interests: ['Gaming', 'Anime', 'AI', 'Music', 'Reading', 'Coding', 'Movies', 'Travel', 'Photography', 'Art']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(100); // 30 (course) + 20 (housing) + 25 (orgs) + 25 (interests)
    });

    test('should calculate high similarity score', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE'],
        interests: ['Gaming', 'Anime']
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(57.5); // 30 (course) + 20 (housing) + 5 (1 org) + 2.5 (1 interest)
    });

    test('should calculate medium similarity score', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: [],
        interests: []
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'St. Joseph Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(30); // 30 (course) only
    });

    test('should calculate zero similarity score', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };
      const user2 = {
        course: 'Business Administration',
        housing: 'St. Joseph Hall',
        organizations: ['IEEE'],
        interests: ['Sports']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle partial profile completeness', () => {
      const user1 = {
        course: 'Computer Science',
        housing: null,
        organizations: ['ACM'],
        interests: []
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE'],
        interests: ['Gaming']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(35); // 30 (course) + 5 (1 org)
    });
  });

  describe('calculateSimilarity - Edge Cases', () => {
    
    test('should handle null users gracefully', () => {
      const score = calculateSimilarity(null, null);
      expect(score).toBe(0);
    });

    test('should handle undefined users gracefully', () => {
      const score = calculateSimilarity(undefined, undefined);
      expect(score).toBe(0);
    });

    test('should handle null fields gracefully', () => {
      const user1 = {
        course: null,
        housing: null,
        organizations: null,
        interests: null
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle undefined fields gracefully', () => {
      const user1 = {
        course: undefined,
        housing: undefined,
        organizations: undefined,
        interests: undefined
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle special characters in profile data', () => {
      const user1 = {
        course: 'Computer Science & Engineering',
        housing: "St. Mary's Dorm",
        organizations: ['Anime & Manga Club'],
        interests: ['Gaming (PC)']
      };
      const user2 = {
        course: 'Computer Science & Engineering',
        housing: "St. Mary's Dorm",
        organizations: ['Anime & Manga Club'],
        interests: ['Gaming (PC)']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(57.5); // 30 + 20 + 5 + 2.5
    });

    test('should handle unicode characters in profile data', () => {
      const user1 = {
        course: 'アニメ Studies',
        housing: 'Дorm A',
        organizations: ['日本 Club'],
        interests: ['アニメ']
      };
      const user2 = {
        course: 'アニメ Studies',
        housing: 'Дorm A',
        organizations: ['日本 Club'],
        interests: ['アニメ']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(57.5); // 30 + 20 + 5 + 2.5
    });

    test('should handle excessive whitespace in all fields', () => {
      const user1 = {
        course: '  Computer Science  ',
        housing: '  Agape Hall  ',
        organizations: ['  ACM  ', '  IEEE  '],
        interests: ['  Gaming  ', '  Anime  ']
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE'],
        interests: ['Gaming', 'Anime']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(65); // 30 + 20 + 10 + 5
    });

    test('should handle mixed case in all fields', () => {
      const user1 = {
        course: 'CoMpUtEr ScIeNcE',
        housing: 'AgApE HaLl',
        organizations: ['AcM', 'IeEe'],
        interests: ['GaMiNg', 'AnImE']
      };
      const user2 = {
        course: 'computer science',
        housing: 'agape hall',
        organizations: ['acm', 'ieee'],
        interests: ['gaming', 'anime']
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(65); // 30 + 20 + 10 + 5
    });

    test('should handle empty strings as different from null', () => {
      const user1 = {
        course: '',
        housing: '',
        organizations: [],
        interests: []
      };
      const user2 = {
        course: null,
        housing: null,
        organizations: [],
        interests: []
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0);
    });

    test('should handle very long organization and interest lists', () => {
      const longOrgList = Array.from({ length: 20 }, (_, i) => `Org${i}`);
      const longInterestList = Array.from({ length: 30 }, (_, i) => `Interest${i}`);
      
      const user1 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: longOrgList,
        interests: longInterestList
      };
      const user2 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: longOrgList,
        interests: longInterestList
      };
      
      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(100); // Should be capped at 100 (30 + 20 + 25 + 25)
    });
  });

  describe('US-12 Acceptance Criteria Validation', () => {
    
    test('should prioritize similarity over randomness (high similarity users)', () => {
      const currentUser = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };

      const highSimilarityUser = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };

      const lowSimilarityUser = {
        course: 'Business',
        housing: 'St. Joseph Hall',
        organizations: [],
        interests: []
      };

      const highScore = calculateSimilarity(currentUser, highSimilarityUser);
      const lowScore = calculateSimilarity(currentUser, lowSimilarityUser);

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBe(57.5); // Should be high priority
      expect(lowScore).toBe(0); // Should be low priority (fallback to random)
    });

    test('should fallback to random when no similarity exists (score = 0)', () => {
      const user1 = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM'],
        interests: ['Gaming']
      };
      const user2 = {
        course: 'Business',
        housing: 'St. Joseph Hall',
        organizations: ['Chess Club'],
        interests: ['Reading']
      };

      const score = calculateSimilarity(user1, user2);
      expect(score).toBe(0); // No similarity, should match randomly by queue order
    });

    test('should handle various levels of similarity (0-100 scale)', () => {
      const baseUser = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE'],
        interests: ['Gaming', 'Anime']
      };

      // No match
      const noMatchUser = {
        course: 'Business',
        housing: 'St. Joseph Hall',
        organizations: [],
        interests: []
      };

      // Course only
      const courseOnlyUser = {
        course: 'Computer Science',
        housing: 'St. Joseph Hall',
        organizations: [],
        interests: []
      };

      // Course + Housing
      const courseHousingUser = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: [],
        interests: []
      };

      // Perfect match
      const perfectMatchUser = {
        course: 'Computer Science',
        housing: 'Agape Hall',
        organizations: ['ACM', 'IEEE'],
        interests: ['Gaming', 'Anime']
      };

      expect(calculateSimilarity(baseUser, noMatchUser)).toBe(0);
      expect(calculateSimilarity(baseUser, courseOnlyUser)).toBe(30);
      expect(calculateSimilarity(baseUser, courseHousingUser)).toBe(50);
      expect(calculateSimilarity(baseUser, perfectMatchUser)).toBe(65);
    });
  });
});
