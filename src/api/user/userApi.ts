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
