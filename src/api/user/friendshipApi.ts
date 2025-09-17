// Friendship Search API
import { getUserInfo } from './loginApi';
import { getToken } from '../util/JwtService';

const API_BASE_URL = 'http://localhost:8080';

export interface SearchUserResponse {
  idUser: string; // UUID của user (API trả về "idUser" thay vì "id")
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  dateOfBirth: [number, number, number]; // [year, month, day]
  gender: boolean; // true: male, false: female
}

export interface SearchResult {
  id: string; // email as unique identifier
  userId?: string; // actual user ID if available
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  age?: number;
  gender: 'Nam' | 'Nữ';
  status?: 'online' | 'offline' | 'busy';
}

// Interface for friend list API response
export interface Friend {
  idUser: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string; // YYYY-MM-DD format
  avatar: string;
  status: boolean;
  enabled: boolean;
  gender: boolean;
  activationCode: string;
  createdAt: number[];
  updatedAt: number[];
  listRoles: Array<{
    idRole: string;
    nameRole: string;
  }>;
}

// Interface for proper friendship API response (matching your backend exactly)
export interface FriendshipRequest {
  id: string; // UUID - friendship ID from database
  requester: Friend;
  addressee: Friend;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: number[]; // LocalDateTime as array [year, month, day, hour, minute, second, nanosecond]
}

export const searchUserByPhone = async (phoneNumber: string): Promise<SearchResult | null> => {
  try {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return null;
    }

    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/friendships/search?phone=${encodeURIComponent(phoneNumber.trim())}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // User not found
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const userData: SearchUserResponse = await response.json();
    
    console.log('API response userData:', userData); // Debug log
    
    // Calculate age from dateOfBirth
    const calculateAge = (birthDate: [number, number, number]): number => {
      const [year, month, day] = birthDate;
      const birth = new Date(year, month - 1, day); // month is 0-indexed in JS
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    };

    // Transform API response to SearchResult
    const searchResult: SearchResult = {
      id: userData.idUser || userData.email, // Use idUser field from API
      userId: userData.idUser, // Store actual user ID for friend requests
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      avatar: userData.avatar || '',
      age: calculateAge(userData.dateOfBirth),
      gender: userData.gender ? 'Nam' : 'Nữ',
      status: 'offline' // Default status
    };

    console.log('Transformed searchResult:', searchResult); // Debug log

    console.log('Search result:', searchResult);
    return searchResult;

  } catch (error) {
    console.error('Search user by phone error:', error);
    throw error;
  }
};

// Validate phone number format
export const validatePhoneNumber = (phone: string): boolean => {
  // Vietnamese phone number formats
  const phoneRegex = /^(0|\+84)[3-9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Format phone number display
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  return phone;
};

// Send friend request - Real API implementation
export const sendFriendRequest = async (addresseeId: string): Promise<boolean> => {
  try {
    // Validate addresseeId
    if (!addresseeId || addresseeId === 'undefined') {
      console.error('Invalid addresseeId:', addresseeId);
      alert('Không thể gửi lời mời kết bạn: Thông tin người dùng không hợp lệ');
      return false;
    }
    
    // Get current user info to get requester ID
    const currentUser = getUserInfo();
    if (!currentUser || !currentUser.id) {
      console.error('No current user or user ID found');
      return false;
    }

    const requesterId = currentUser.id;
    
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    console.log('Sending friend request:', { requesterId, addresseeId });

    const response = await fetch(`${API_BASE_URL}/friendships/send?requesterId=${encodeURIComponent(requesterId)}&addresseeId=${encodeURIComponent(addresseeId)}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Send friend request failed: HTTP ${response.status}: ${errorText}`);
      return false;
    }

    console.log('Friend request sent successfully');
    return true;

  } catch (error) {
    console.error('Send friend request error:', error);
    return false;
  }
};

// Friend request response actions
export type FriendRequestAction = 'accept' | 'reject';

// Respond to friend request - Real API implementation  
export const respondToFriendRequest = async (friendshipId: string, action: FriendRequestAction): Promise<boolean> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    console.log('Responding to friend request:', { friendshipId, action });
    console.log('Full API URL:', `${API_BASE_URL}/friendships/${encodeURIComponent(friendshipId)}/respond?action=${action}`);

    const response = await fetch(`${API_BASE_URL}/friendships/${encodeURIComponent(friendshipId)}/respond?action=${action}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Friend request response failed: HTTP ${response.status}: ${errorText}`);
      alert(`Lỗi ${response.status}: ${errorText}`);
      return false;
    }

    console.log(`Friend request ${action}ed successfully`);
    alert(`${action === 'accept' ? 'Đã chấp nhận' : 'Đã từ chối'} lời mời kết bạn!`);
    return true;

  } catch (error) {
    console.error('Respond to friend request error:', error);
    return false;
  }
};

// Helper functions for friend request management
export const acceptFriendRequest = async (friendshipId: string): Promise<boolean> => {
  return await respondToFriendRequest(friendshipId, 'accept');
};

export const rejectFriendRequest = async (friendshipId: string): Promise<boolean> => {
  return await respondToFriendRequest(friendshipId, 'reject');
};

// Get actual friends list (accepted friendships) - Real API implementation
export const getFriendsList = async (): Promise<SearchResult[]> => {
  try {
    const currentUser = getUserInfo();
    if (!currentUser || !currentUser.id) {
      console.error('No current user or user ID found');
      return [];
    }

    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const userId = currentUser.id;
    console.log('Getting friends list for user:', userId);

    // Using API: GET /friendships/{userId}/friends - Returns accepted friends (User objects)
    const response = await fetch(`${API_BASE_URL}/friendships/${encodeURIComponent(userId)}/friends`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No friends found
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const friendsData: Friend[] = await response.json();
    console.log('Friends list API response:', friendsData);

    // Transform friends data to SearchResult format
    const transformedFriends: SearchResult[] = friendsData.map(friend => {
      // Calculate age from dateOfBirth
      const calculateAge = (dateOfBirth: string): number => {
        const birth = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        
        return age;
      };

      return {
        id: friend.idUser,
        userId: friend.idUser,
        firstName: friend.firstName,
        lastName: friend.lastName,
        email: friend.email,
        phoneNumber: friend.phoneNumber,
        avatar: friend.avatar || '',
        age: calculateAge(friend.dateOfBirth),
        gender: friend.gender ? 'Nam' : 'Nữ',
        status: friend.status ? 'online' : 'offline'
      };
    });

    console.log('Transformed friends list:', transformedFriends);
    return transformedFriends;

  } catch (error) {
    console.error('Get friends list error:', error);
    return [];
  }
};

// Get friend requests list - Using perfect API with Friendship objects
export const getFriendRequestsList = async (): Promise<SearchResult[]> => {
  try {
    const currentUser = getUserInfo();
    if (!currentUser || !currentUser.id) {
      console.error('No current user or user ID found');
      return [];
    }

    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const userId = currentUser.id;
    console.log('Getting friendships for user:', userId);

    // Using API: GET /friendships/{userId}/friendships - Returns Friendship objects with IDs!
    const response = await fetch(`${API_BASE_URL}/friendships/${encodeURIComponent(userId)}/friendships`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No friendships found
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const friendshipRequestsData: FriendshipRequest[] = await response.json();
    console.log('Friendships API response:', friendshipRequestsData);

    const currentUserId = getUserInfo()?.id;
    
    // Filter only PENDING requests where current user is ADDRESSEE (person who can accept/reject)
    const pendingRequestsToMe = friendshipRequestsData.filter(friendship => 
      friendship.status === 'PENDING' && 
      friendship.addressee.idUser === currentUserId
    );
    console.log('Filtered pending requests where I am addressee:', pendingRequestsToMe);

    // Transform friendship requests data to SearchResult format
    const transformedFriendRequests: SearchResult[] = pendingRequestsToMe.map(friendship => {
      // Show the requester info (person who sent the friend request)
      const requesterUser = friendship.requester;
      
      // Calculate age from dateOfBirth
      const calculateAge = (dateOfBirth: string): number => {
        const birth = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        
        return age;
      };

      return {
        id: friendship.id, // 🎯 Real friendship ID!
        userId: requesterUser.idUser,
        firstName: requesterUser.firstName,
        lastName: requesterUser.lastName,
        email: requesterUser.email,
        phoneNumber: requesterUser.phoneNumber,
        avatar: requesterUser.avatar || '',
        age: calculateAge(requesterUser.dateOfBirth),
        gender: requesterUser.gender ? 'Nam' : 'Nữ',
        status: requesterUser.status ? 'online' : 'offline'
      };
    });

    console.log('Transformed friend requests:', transformedFriendRequests);
    return transformedFriendRequests;

  } catch (error) {
    console.error('Get friend requests list error:', error);
    return [];
  }
};