import { getToken } from '../util/JwtService';
import { API_BASE_URL } from '../API_BASE_URL';

export interface TotalLikesResponse {
  totalLikes: number;
  message: string;
  posterId: string;
}

/**
 * Like a poster
 * POST /api/like-posters/{posterId}?userId={userId}
 */
export const likePoster = async (posterId: string, userId: string): Promise<boolean> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/like-posters/${encodeURIComponent(posterId)}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Like poster failed: HTTP ${response.status}: ${errorText}`);
      return false;
    }

    console.log('✅ Liked poster successfully:', posterId);
    return true;
  } catch (error) {
    console.error('Like poster error:', error);
    return false;
  }
};

/**
 * Unlike a poster
 * DELETE /api/like-posters/{posterId}?userId={userId}
 */
export const unlikePoster = async (posterId: string, userId: string): Promise<boolean> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/like-posters/${encodeURIComponent(posterId)}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Unlike poster failed: HTTP ${response.status}: ${errorText}`);
      return false;
    }

    console.log('✅ Unliked poster successfully:', posterId);
    return true;
  } catch (error) {
    console.error('Unlike poster error:', error);
    return false;
  }
};

/**
 * Get total likes for a poster
 * GET /api/like-posters/{posterId}/total
 */
export const getTotalLikes = async (posterId: string): Promise<number> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/like-posters/${encodeURIComponent(posterId)}/total`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      console.error(`Get total likes failed: HTTP ${response.status}`);
      return 0;
    }

    const data: TotalLikesResponse = await response.json();
    return data.totalLikes || 0;
  } catch (error) {
    console.error('Get total likes error:', error);
    return 0;
  }
};

/**
 * Check if user has liked a poster
 * We'll need to track this in the frontend state since there's no specific API endpoint
 * This is a helper to manage the liked state locally
 */
export const checkUserLikedPoster = (posterId: string, userId: string): boolean => {
  const likedPostersKey = `liked_posters_${userId}`;
  const likedPosters = JSON.parse(localStorage.getItem(likedPostersKey) || '[]');
  return likedPosters.includes(posterId);
};

/**
 * Store user's liked poster in local storage
 */
export const setUserLikedPoster = (posterId: string, userId: string, liked: boolean): void => {
  const likedPostersKey = `liked_posters_${userId}`;
  let likedPosters = JSON.parse(localStorage.getItem(likedPostersKey) || '[]');
  
  if (liked && !likedPosters.includes(posterId)) {
    likedPosters.push(posterId);
  } else if (!liked) {
    likedPosters = likedPosters.filter((id: string) => id !== posterId);
  }
  
  localStorage.setItem(likedPostersKey, JSON.stringify(likedPosters));
};
