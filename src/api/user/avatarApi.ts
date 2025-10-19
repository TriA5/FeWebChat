import { API_BASE_URL } from '../API_BASE_URL';
import { getToken } from '../util/JwtService';



export interface ChangeAvatarRequest {
  idUser: string;
  avatar: string; // data URL (data:image/png;base64,....)
}

export interface ChangeAvatarResponse {
  success: boolean;
  message: string;
  avatar?: string;
}

export const changeAvatar = async (idUser: string, avatarDataUrl: string): Promise<ChangeAvatarResponse> => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('⚠️ No JWT token found when attempting to change avatar');
    }
    const body: ChangeAvatarRequest = { idUser, avatar: avatarDataUrl };

    const response = await fetch(`${API_BASE_URL}/user/change-avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });

    const contentType = response.headers.get('content-type') || '';
    let payload: any;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = { message: text, success: response.ok };
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('401 Unauthorized: Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      }
      throw new Error(payload?.message || `HTTP ${response.status}`);
    }

    return {
      success: true,
      message: payload?.message || 'Đổi avatar thành công',
      avatar: payload?.avatar || avatarDataUrl
    };
  } catch (error: any) {
    console.error('Change avatar error:', error);
    return {
      success: false,
      message: error.message || 'Đổi avatar thất bại'
    };
  }
};
