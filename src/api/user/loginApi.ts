// Login API
import { API_BASE_URL } from '../API_BASE_URL';
import { saveToken, removeToken, isTokenValid } from '../util/JwtService';



export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  jwtToken?: string;
  token?: string;
  message?: string;
  success?: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export const authenticate = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Accept': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!response.ok) {
      const errorData = await response.text();

      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    // Kiểm tra response content type
    const contentType = response.headers.get('content-type');
    let result: LoginResponse;
    
    if (contentType && contentType.includes('application/json')) {
      const jsonResult = await response.json();
      result = {
        success: true,
        jwtToken: jsonResult.jwtToken,
        token: jsonResult.jwtToken, // Để backward compatibility
        message: 'Đăng nhập thành công'
      };
    } else {
      // Nếu server trả về text thay vì JSON (có thể là JWT token)
      const textResult = await response.text();
      result = {
        success: true,
        message: textResult,
        token: textResult // Giả sử server trả về token dưới dạng text
      };
    }

    // Lưu token vào localStorage nếu login thành công
    const tokenToSave = result.jwtToken || result.token;
    if (result.success && tokenToSave) {
      saveToken(tokenToSave);
    }

    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Validation helper
export const validateLoginForm = (username: string, password: string): string[] => {
  const errors: string[] = [];
  
  if (!username || username.trim() === '') {
    errors.push('Username không được để trống');
  }
  
  if (!password || password.trim() === '') {
    errors.push('Password không được để trống');
  }
  
  return errors;
};

// Token management functions
export const logout = (): void => {
  removeToken();
};

export const isLoggedIn = (): boolean => {
  return isTokenValid();
};

// Re-export functions from JwtService for convenience
export { getToken, getUserInfo } from '../util/JwtService';
