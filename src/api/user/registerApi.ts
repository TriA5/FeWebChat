import { API_BASE_URL } from '../API_BASE_URL';
export interface RegisterRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    username: string;
    email: string;
  };
}

// API đăng ký người dùng
export const registerUser = async (userData: RegisterRequest): Promise<RegisterResponse> => {
  try {
    console.log('Sending registration data:', userData);

    const response = await fetch(`${API_BASE_URL}/users/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData),
});

const contentType = response.headers.get('content-type');
let data;

if (contentType && contentType.includes('application/json')) {
  data = await response.json(); // parse JSON nếu backend trả JSON
} else {
  const textData = await response.text(); // parse text nếu backend trả chuỗi
  data = {
    success: response.ok,
    message: textData || 'Đăng ký thành công!',
  };
}


    if (!response.ok) {
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error('Register API Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi đăng ký',
    };
  }
};


// Validation helper cho form đăng ký
export const validateRegisterForm = (formData: RegisterRequest): string[] => {
  const errors: string[] = [];

  if (!formData.username || formData.username.length < 3) {
    errors.push('Tên đăng nhập phải có ít nhất 3 ký tự');
  }

  if (!formData.password || formData.password.length < 6) {
    errors.push('Mật khẩu phải có ít nhất 6 ký tự');
  }

  if (!formData.firstName.trim()) {
    errors.push('Họ không được để trống');
  }

  if (!formData.lastName.trim()) {
    errors.push('Tên không được để trống');
  }

  if (!formData.email || !isValidEmail(formData.email)) {
    errors.push('Email không hợp lệ');
  }

  if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
    errors.push('Số điện thoại phải có ít nhất 10 số');
  }

  if (!formData.dateOfBirth) {
    errors.push('Ngày sinh không được để trống');
  }

  return errors;
};

// Helper function để validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
