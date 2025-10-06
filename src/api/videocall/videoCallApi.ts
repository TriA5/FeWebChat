import { getToken } from '../util/JwtService';

const API_BASE_URL = 'http://localhost:8080';

export interface VideoCallDTO {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  status: 'INITIATED' | 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'ENDED' | 'TIMEOUT';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface VideoCallSignalDTO {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: 'CALL_OFFER' | 'CALL_ANSWER' | 'ICE_CANDIDATE' | 'CALL_ACCEPT' | 'CALL_REJECT' | 'CALL_END' | 'CALL_TIMEOUT';
  data?: any; // SDP offer/answer or ICE candidate
}

export async function initiateCall(callerId: string, calleeId: string): Promise<VideoCallDTO> {
  const token = getToken();
  console.log('📞 Initiating call API:', { callerId, calleeId });
  
  const response = await fetch(`${API_BASE_URL}/video-call/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ callerId, calleeId })
  });
  
  console.log('📞 API Response status:', response.status);
  console.log('📞 API Response headers:', response.headers);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('📞 API Error response:', errorText);
    throw new Error(errorText);
  }
  
  const responseText = await response.text();
  console.log('📞 API Response text:', responseText);
  
  if (!responseText) {
    throw new Error('Empty response from server');
  }
  
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('📞 JSON parse error:', error);
    console.error('📞 Response text was:', responseText);
    throw new Error('Invalid JSON response from server');
  }
}

export async function endCall(callId: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/video-call/${callId}/end`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function getCallHistory(userId: string): Promise<VideoCallDTO[]> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/video-call/history?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
  
  return response.json();
}

export async function getActiveCall(userId: string): Promise<VideoCallDTO | null> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/video-call/active?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
  
  const result = await response.json();
  return result || null;
}