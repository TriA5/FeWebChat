import { API_BASE_URL } from '../API_BASE_URL';
import { getToken } from '../util/JwtService';



export interface ChatMessageDTO {
  id: string;
  conversationId?: string; // null cho group chat
  groupId?: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}
export interface GroupConversationDTO {
  id: string;
  name: string;
  createdBy: string;
}

export interface GroupMemberDTO {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  role: 'ADMIN' | 'MEMBER';
}
export interface ConversationDTO {
  id: string;
  participant1Id: string;
  participant2Id: string;
}

export async function ensureConversation(userAId: string, userBId: string): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/chats/ensure?userAId=${encodeURIComponent(userAId)}&userBId=${encodeURIComponent(userBId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to ensure conversation');
  const id = await res.text();
  // backend returns UUID as JSON string or plain UUID; normalize quotes
  return id.replace(/"/g, '');
}

export async function getMessages(conversationId: string): Promise<ChatMessageDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/chats/${encodeURIComponent(conversationId)}/messages`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to get messages');
  return res.json();
}

export async function listConversations(userId: string): Promise<ConversationDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/chats/conversations?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to list conversations');
  return res.json();
}
export async function createGroup(creatorId: string, groupName: string, initialMemberIds: string[]): Promise<GroupConversationDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/create?creatorId=${encodeURIComponent(creatorId)}&groupName=${encodeURIComponent(groupName)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(initialMemberIds)
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to create group');
  return res.json();
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(groupId)}/join?userId=${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to join group');
}

export async function getGroupMessages(groupId: string): Promise<ChatMessageDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to get group messages');
  return res.json();
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string): Promise<ChatMessageDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  // Gửi nội dung thuần (plain text) để backend không lưu thừa dấu "..."
  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(groupId)}/messages?senderId=${encodeURIComponent(senderId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Authorization': `Bearer ${token}`
    },
    body: content
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to send group message');
  return res.json();
}

export async function listGroups(userId: string): Promise<GroupConversationDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/user/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to list groups');
  return res.json();
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberDTO[]> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to get group members');
  return res.json();
}

export async function removeMemberFromGroup(groupId: string, userId: string, requesterId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}?requesterId=${encodeURIComponent(requesterId)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to remove member');
  }
}

export async function deleteGroup(groupId: string, requesterId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(groupId)}?requesterId=${encodeURIComponent(requesterId)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to delete group');
  }
}

export async function sendImageMessage(conversationId: string, senderId: string, imageFile: File): Promise<ChatMessageDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const res = await fetch(`${API_BASE_URL}/chats/${encodeURIComponent(conversationId)}/send-image?senderId=${encodeURIComponent(senderId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to send image message');
  }
  
  return res.json();
}

export async function sendGroupImageMessage(groupId: string, senderId: string, imageFile: File): Promise<ChatMessageDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const res = await fetch(`${API_BASE_URL}/chats/group/${encodeURIComponent(groupId)}/send-image?senderId=${encodeURIComponent(senderId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to send group image message');
  }
  
  return res.json();
}

export async function sendFileMessage(conversationId: string, senderId: string, file: File): Promise<ChatMessageDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/chats/${encodeURIComponent(conversationId)}/send-file?senderId=${encodeURIComponent(senderId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to send file message');
  }
  
  return res.json();
}

export async function sendGroupFileMessage(groupId: string, senderId: string, file: File): Promise<ChatMessageDTO> {
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/chats/group/${encodeURIComponent(groupId)}/send-file?senderId=${encodeURIComponent(senderId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to send group file message');
  }
  
  return res.json();
}
