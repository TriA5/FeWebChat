import { getToken } from '../util/JwtService';

const API_BASE_URL = 'http://localhost:8080';

export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  participant1Id: string;
  participant2Id: string;
}

export async function ensureConversation(userAId: string, userBId: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/chat/ensure?userAId=${encodeURIComponent(userAId)}&userBId=${encodeURIComponent(userBId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  const id = await res.text();
  // backend returns UUID as JSON string or plain UUID; normalize quotes
  return id.replace(/"/g, '');
}

export async function getMessages(conversationId: string): Promise<ChatMessageDTO[]> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/chat/${encodeURIComponent(conversationId)}/messages`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listConversations(userId: string): Promise<ConversationDTO[]> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/chat/conversations?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
