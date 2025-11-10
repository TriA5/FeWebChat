import { getToken } from '../util/JwtService';
import { API_BASE_URL } from '../API_BASE_URL';

// Interfaces
export interface SharePosterDTO {
  idShare: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  idUser: string;
  userName: string;
  userAvatar?: string;
  privacyStatusName: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  originalPoster: {
    idPoster: string;
    content: string;
    userName: string;
    userAvatar?: string;
    images?: string[];
    videos?: Array<{
      url: string;
      thumbnailUrl?: string;
    }>;
  };
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
}

export interface CreateShareRequest {
  posterId: string;
  userId: string;
  content: string;
  privacyStatusName: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}

export interface UpdateShareRequest {
  userId: string;
  content: string;
  privacyStatusName: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}

export interface ShareCommentDTO {
  idCommentShare: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  idUser: string;
  userName: string;
  userAvatar?: string;
  parentCommentId?: string;
  likeCount: number;
  replyCount: number;
  replies?: ShareCommentDTO[];
  isLiked?: boolean;
}

export interface CreateCommentRequest {
  userId: string;
  content: string;
}

export interface LikeRequest {
  userId: string;
}

// Share Poster APIs
export async function createShare(request: CreateShareRequest): Promise<SharePosterDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to create share');
  return res.json();
}

export async function updateShare(shareId: string, request: UpdateShareRequest): Promise<SharePosterDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to update share');
  return res.json();
}

export async function deleteShare(shareId: string, userId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to delete share');
}

export async function getShareDetails(shareId: string): Promise<SharePosterDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get share');
  return res.json();
}

export async function getSharesByUser(userId: string): Promise<SharePosterDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/user/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get shares');
  return res.json();
}

export async function getSharesByPoster(posterId: string): Promise<SharePosterDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/poster/${posterId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get shares');
  return res.json();
}

export async function getShareFeed(viewerId: string): Promise<SharePosterDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/feed/${viewerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get feed');
  return res.json();
}

export async function countSharesOfPoster(posterId: string): Promise<{ posterId: string; shareCount: number }> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/count/${posterId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to count shares');
  return res.json();
}

// Like Share APIs
export async function likeShare(shareId: string, request: LikeRequest): Promise<{ message: string; likeCount: number }> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to like share');
  return res.json();
}

export async function unlikeShare(shareId: string, userId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/like?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to unlike share');
}

export async function checkIfUserLikedShare(shareId: string, userId: string): Promise<{ isLiked: boolean }> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/like/check?userId=${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to check like');
  return res.json();
}

export async function getLikeCountShare(shareId: string): Promise<number> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/like/count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get like count');
  return res.json();
}

export async function getUsersWhoLikedShare(shareId: string): Promise<Array<{ idUser: string; username: string; avatar?: string }>> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/likes`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get users');
  return res.json();
}

// Comment Share APIs
export async function createShareComment(shareId: string, request: CreateCommentRequest): Promise<ShareCommentDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to create comment');
  return res.json();
}

export async function replyToShareComment(commentId: string, request: CreateCommentRequest): Promise<ShareCommentDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/comments/${commentId}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to reply comment');
  return res.json();
}

export async function updateShareComment(commentId: string, request: CreateCommentRequest): Promise<ShareCommentDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to update comment');
  return res.json();
}

export async function deleteShareComment(commentId: string, userId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/comments/${commentId}?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to delete comment');
}

export async function getShareComments(shareId: string): Promise<ShareCommentDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/${shareId}/comments`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get comments');
  return res.json();
}

export async function getShareCommentDetails(commentId: string): Promise<ShareCommentDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/comments/${commentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to get comment');
  return res.json();
}

// Like Comment APIs
export async function likeShareComment(commentId: string, request: LikeRequest): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to like comment');
}

export async function unlikeShareComment(commentId: string, userId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const res = await fetch(`${API_BASE_URL}/shares/comments/${commentId}/like?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) throw new Error(await res.text() || 'Failed to unlike comment');
}
