/**
 * API Service for Animatch Frontend
 * Handles all backend API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sessionToken');
  }
  return null;
};

/**
 * Submit a report
 * POST /api/reports
 */
export const submitReport = async (reportData) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  try {
    const response = await fetch(`${API_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(reportData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit report');
    }

    return data;
  } catch (error) {
    // Better error messages for common issues
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000');
    }
    throw error;
  }
};

/**
 * Get user's submitted reports
 * GET /api/reports/my-reports
 */
export const getMyReports = async () => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  try {
    const response = await fetch(`${API_URL}/api/reports/my-reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch reports');
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000');
    }
    throw error;
  }
};

/**
 * Unmatch from current chat
 * POST /api/unmatch
 */
export const unmatchUser = async () => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  try {
    const response = await fetch(`${API_URL}/api/unmatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to unmatch');
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000');
    }
    throw error;
  }
};

/**
 * Get unmatch history
 * GET /api/unmatch/history
 */
export const getUnmatchHistory = async () => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  try {
    const response = await fetch(`${API_URL}/api/unmatch/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch unmatch history');
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000');
    }
    throw error;
  }
};
