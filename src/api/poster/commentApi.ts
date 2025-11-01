import { getToken } from '../util/JwtService';
import { API_BASE_URL } from '../API_BASE_URL';

export interface Comment {
  idComment: string;
  content: string;
  idUser: string;
  idPoster: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
  replyCount: number;
  // Extended fields that will be populated from user data
  userName?: string;
  userAvatar?: string;
  userFirstName?: string;
  userLastName?: string;
}

/**
 * Get all comments for a specific poster
 * GET /api/comments/{posterId}
 */
export const getCommentsByPosterId = async (posterId: string): Promise<Comment[]> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/comments/${encodeURIComponent(posterId)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No comments found
      }
      const errorText = await response.text();
      console.error(`Get comments failed: HTTP ${response.status}: ${errorText}`);
      return [];
    }

    const data: Comment[] = await response.json();
    console.log(`✅ Fetched ${data.length} comments for poster ${posterId}`);
    return data || [];
  } catch (error) {
    console.error('Get comments error:', error);
    return [];
  }
};

/**
 * Format comment time relative to now
 */
export const formatCommentTime = (timestamp: string): string => {
  try {
    const commentDate = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Vừa xong';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} phút`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} giờ`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)} ngày`;
    } else {
      return commentDate.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: commentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    return '';
  }
};

/**
 * Count total comments including replies recursively
 */
export const countTotalComments = (comments: Comment[]): number => {
  let total = 0;
  for (const comment of comments) {
    total += 1; // Count the comment itself
    if (comment.replies && comment.replies.length > 0) {
      total += countTotalComments(comment.replies); // Recursively count replies
    }
  }
  return total;
};

/**
 * Create a new comment on a poster
 * POST /api/comments/{posterId}
 */
export const createComment = async (
  posterId: string,
  userId: string,
  content: string
): Promise<Comment | null> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/comments/${encodeURIComponent(posterId)}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          userId
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Create comment failed: HTTP ${response.status}: ${errorText}`);
      return null;
    }

    const newComment: Comment = await response.json();
    console.log('✅ Comment created successfully:', newComment);
    return newComment;
  } catch (error) {
    console.error('Create comment error:', error);
    return null;
  }
};

/**
 * Reply to a comment
 * POST /api/comments/{posterId}/{parentCommentId}/reply
 */
export const replyToComment = async (
  posterId: string,
  parentCommentId: string,
  userId: string,
  content: string
): Promise<Comment | null> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/comments/${encodeURIComponent(posterId)}/${encodeURIComponent(parentCommentId)}/reply`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          userId
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Reply to comment failed: HTTP ${response.status}: ${errorText}`);
      return null;
    }

    const newReply: Comment = await response.json();
    console.log('✅ Reply created successfully:', newReply);
    return newReply;
  } catch (error) {
    console.error('Reply to comment error:', error);
    return null;
  }
};

/**
 * Update/Edit a comment
 * PUT /api/comments/{posterId}/{commentId}?userId={userId}&content={newContent}
 */
export const updateComment = async (
  posterId: string,
  commentId: string,
  userId: string,
  content: string
): Promise<Comment | null> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/comments/${encodeURIComponent(posterId)}/${encodeURIComponent(commentId)}?userId=${encodeURIComponent(userId)}&content=${encodeURIComponent(content)}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Update comment failed: HTTP ${response.status}: ${errorText}`);
      return null;
    }

    const updatedComment: Comment = await response.json();
    console.log('✅ Comment updated successfully:', updatedComment);
    return updatedComment;
  } catch (error) {
    console.error('Update comment error:', error);
    return null;
  }
};

/**
 * Delete a comment
 * DELETE /api/comments/{posterId}/{commentId}?userId={userId}
 */
export const deleteComment = async (
  posterId: string,
  commentId: string,
  userId: string
): Promise<boolean> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/comments/${encodeURIComponent(posterId)}/${encodeURIComponent(commentId)}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Delete comment failed: HTTP ${response.status}: ${errorText}`);
      return false;
    }

    console.log('✅ Comment deleted successfully');
    return true;
  } catch (error) {
    console.error('Delete comment error:', error);
    return false;
  }
};
