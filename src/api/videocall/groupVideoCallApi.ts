import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

export interface ParticipantInfo {
  userId: string;
  userName: string;
  userAvatar: string;
}

export interface GroupVideoCallDTO {
  id: string;
  groupId: string;
  groupName: string;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar: string;
  participants: ParticipantInfo[];
  status: 'ACTIVE' | 'ENDED';
  createdAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface GroupVideoCallSignalDTO {
  callId: string;
  fromUserId: string;
  toUserId?: string;
  type: 'CALL_INITIATED' | 'USER_JOINED' | 'USER_LEFT' | 'CALL_ENDED' | 'PEER_OFFER' | 'PEER_ANSWER' | 'ICE_CANDIDATE';
  data?: any;
}

/**
 * Initiate a new group video call
 * All group members will receive notification (NO friendship check)
 */
export const initiateGroupCall = async (
  groupId: string,
  initiatorId: string
): Promise<GroupVideoCallDTO> => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_BASE_URL}/group-video-call/initiate`,
    { groupId, initiatorId },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Join an existing group video call
 * NO friendship check - any group member can join
 */
export const joinGroupCall = async (
  callId: string,
  userId: string
): Promise<GroupVideoCallDTO> => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_BASE_URL}/group-video-call/${callId}/join`,
    { userId },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Leave a group video call
 */
export const leaveGroupCall = async (callId: string, userId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.post(
    `${API_BASE_URL}/group-video-call/${callId}/leave`,
    { userId },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

/**
 * End a group video call (only initiator can end)
 */
export const endGroupCall = async (callId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.post(
    `${API_BASE_URL}/group-video-call/${callId}/end`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

/**
 * Get active call for a group
 */
export const getActiveGroupCall = async (groupId: string): Promise<GroupVideoCallDTO | null> => {
  const token = localStorage.getItem('token');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/group-video-call/group/${groupId}/active`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 204) {
      return null; // No active call
    }
    throw error;
  }
};

/**
 * Get call history for a group
 */
export const getGroupCallHistory = async (groupId: string): Promise<GroupVideoCallDTO[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(
    `${API_BASE_URL}/group-video-call/group/${groupId}/history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
