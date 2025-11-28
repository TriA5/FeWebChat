import { getToken } from '../util/JwtService';
import { API_BASE_URL } from '../API_BASE_URL';


export interface BasicUserDTO {
  idUser: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phoneNumber?: string;
}

export async function getUserById(userId: string): Promise<BasicUserDTO | null> {
  if (!userId) return null;
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text() || 'Failed to fetch user');
  return res.json();
}

export async function searchUserByPhone(phoneNumber: string): Promise<BasicUserDTO | null> {
  if (!phoneNumber) return null;
  const token = getToken();
  if (!token) throw new Error('No JWT token found');
  const res = await fetch(`${API_BASE_URL}/friendships/search?phone=${encodeURIComponent(phoneNumber)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text() || 'Không tìm thấy người dùng');
  return res.json();
}

export async function changePassword(idUser: string, newPassword: string): Promise<any> {
  if (!idUser) throw new Error('User id is required');
  const token = getToken();
  if (!token) throw new Error('No JWT token found');

  // Single PUT endpoint: /users/change-password
  const url = `${API_BASE_URL}/users/change-password`;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Helper to process Response -> object or throw
  const process = async (res: Response) => {
    const text = await res.text();
    if (!res.ok) {
      const serverMsg = text && text.trim() ? text : undefined;
      throw new Error(serverMsg || `Failed to change password (status ${res.status})`);
    }
    if (!text || text.trim() === '') return { success: true };
    try { return JSON.parse(text); } catch { return { message: text }; }
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ idUser, newPassword })
  });

  return await process(res);
}

export async function forgotPassword(email: string): Promise<any> {
  if (!email) throw new Error('Email is required');
  const token = getToken();
  // It's OK if no token is present for public endpoints; include if available
  const headers: Record<string,string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/users/forgot-password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ email })
  });

  const text = await res.text();
  if (!res.ok) {
    const serverMsg = text && text.trim() ? text : undefined;
    throw new Error(serverMsg || 'Failed to request password reset');
  }

  if (!text || text.trim() === '') return { success: true };

  try {
    return JSON.parse(text);
  } catch (err) {
    return { message: text };
  }
}
