/**
 * Interest-Based Matchmaking Algorithm
 * 
 * This module implements a priority-based matching system that:
 * 1. Calculates similarity scores based on shared profile data (course, housing, organizations)
 * 2. Prioritizes matches with higher similarity
 * 3. Falls back to random matching if no suitable matches are found
 */

/**
 * Calculate similarity score between two users based on their profile data
 * 
 * Scoring system:
 * - Same Course: +3 points
 * - Same Housing: +2 points
 * - Each shared Organization: +1 point
 * 
 * @param {Object} userProfile - Current user's profile { course, housing, organizations, interests }
 * @param {Object} candidateProfile - Candidate user's profile { course, housing, organizations, interests }
 * @returns {number} Similarity score (0 = no match, higher = more similar)
 */
export function calculateSimilarityScore(userProfile, candidateProfile) {
    let score = 0;
    
    // Validate inputs
    if (!userProfile || !candidateProfile) {
        return score;
    }

    // 1. Check Course Match (High Priority)
    if (userProfile.course && candidateProfile.course && 
        userProfile.course.trim().toLowerCase() === candidateProfile.course.trim().toLowerCase()) {
        score += 3;
    }

    // 2. Check Housing Match (Medium Priority)
    if (userProfile.housing && candidateProfile.housing && 
        userProfile.housing.trim().toLowerCase() === candidateProfile.housing.trim().toLowerCase()) {
        score += 2;
    }

    // 3. Check Organizations Match (Cumulative)
    if (Array.isArray(userProfile.organizations) && Array.isArray(candidateProfile.organizations)) {
        const userOrgs = new Set(userProfile.organizations.map(o => o.trim().toLowerCase()));
        const candidateOrgs = new Set(candidateProfile.organizations.map(o => o.trim().toLowerCase()));

        for (const org of userOrgs) {
            if (candidateOrgs.has(org)) {
                score += 1;
            }
        }
    }

    return score;
}

/**
 * Find the best match for a user from a list of candidates
 * 
 * Priority:
 * 1. Candidates with similarity score > 0 (sorted by score, descending)
 * 2. If no similar candidates, return random candidate
 * 3. If no candidates at all, return null
 * 
 * @param {Object} userProfile - Current user's profile data
 * @param {Array} candidates - Array of candidate queue entries with profile data
 * @param {number} minSimilarityThreshold - Minimum score to prefer over random (default: 1)
 * @returns {Object|null} Best match candidate or null if no candidates
 */
export function findBestMatch(userProfile, candidates, minSimilarityThreshold = 1) {
    // No candidates available
    if (!candidates || candidates.length === 0) {
        return null;
    }

    // Single candidate - return it regardless of similarity
    if (candidates.length === 1) {
        return candidates[0];
    }

    // Calculate scores for all candidates
    const candidatesWithScores = candidates.map(candidate => ({
        candidate,
        score: calculateSimilarityScore(userProfile, candidate.profileData)
    }));

    // Sort by score (descending)
    candidatesWithScores.sort((a, b) => b.score - a.score);

    // Get the best candidate
    const bestMatch = candidatesWithScores[0];

    // If best match meets threshold, use similarity-based matching
    if (bestMatch.score >= minSimilarityThreshold) {
        return bestMatch.candidate;
    }

    // Fallback to random matching
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
}

/**
 * Get matching strategy description based on score
 * 
 * @param {number} score - Similarity score
 * @param {number} threshold - Minimum threshold for similarity matching
 * @returns {string} Description of matching strategy used
 */
export function getMatchingStrategy(score, threshold = 1) {
    if (score >= threshold) {
        return 'similarity-based';
    }
    return 'random-fallback';
}
