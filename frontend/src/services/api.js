/**
 * API Service for AniMatch
 * Handles all backend API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Get authorization header with JWT token
 */
const getAuthHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Unmatch from current chat partner
 * @returns {Promise<Object>} Response data
 */
export const unmatchUser = async () => {
  try {
    const response = await fetch(`${API_URL}/api/unmatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to unmatch');
    }

    return data;
  } catch (error) {
    console.error('[API] Unmatch error:', error);
    throw error;
  }
};

/**
 * Get unmatch history for current user
 * @returns {Promise<Object>} Unmatch history
 */
export const getUnmatchHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/api/unmatch/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get unmatch history');
    }

    return data;
  } catch (error) {
    console.error('[API] Get unmatch history error:', error);
    throw error;
  }
};

export default {
  unmatchUser,
  getUnmatchHistory
};
