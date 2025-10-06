import { getToken } from '../util/JwtService';

const API_BASE_URL = 'http://localhost:8080';

export interface UpdateProfileRequest {
  idUser: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: boolean; // true male, false female
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const updateUserProfile = async (payload: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type') || '';
    let result: any;
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { message: text, success: response.ok };
    }

    if (!response.ok) {
      throw new Error(result?.message || `HTTP ${response.status}`);
    }

    return { success: true, message: result?.message || 'Cập nhật thành công', data: result };
  } catch (err: any) {
    console.error('Update profile error:', err);
    return { success: false, message: err.message || 'Cập nhật thất bại' };
  }
};
