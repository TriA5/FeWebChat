// Types cho API kích hoạt tài khoản
export interface ActiveAccountRequest {
  email: string;
  activationCode: string;
}

export interface ActiveAccountResponse {
  success: boolean;
  message: string;
  data?: any;
}

// API kích hoạt tài khoản
export const activeAccount = async (email: string, activationCode: string): Promise<ActiveAccountResponse> => {
  try {
    console.log('Activating account for:', email); // Debug log
    console.log('Activation code:', activationCode); // Debug log
    
    // Đảm bảo email được decode hoàn toàn trước khi gửi
    const cleanEmail = decodeEmailCompletely(email);
    const cleanCode = activationCode.trim();
    
    console.log('Original email:', email);
    console.log('Clean email:', cleanEmail);
    console.log('Clean code:', cleanCode);
    
    // Xây dựng URL thủ công, không encode @ trong email
    const baseUrl = 'https://unpessimistically-unbewailed-christy.ngrok-free.dev/api/users/active-account';
    
    // Sử dụng helper function để encode email properly
    const emailForUrl = encodeEmailForUrl(cleanEmail);
    const codeForUrl = encodeURIComponent(cleanCode);
    
    const queryString = `email=${emailForUrl}&activationCode=${codeForUrl}`;
    const finalUrl = `${baseUrl}?${queryString}`;
    
    console.log('Manual URL construction:', finalUrl);
    console.log('Email in URL (preserving @):', emailForUrl);
    console.log('Server will receive email as:', emailForUrl);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status); // Debug log

    // Xử lý response dựa trên content type
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Nếu không phải JSON, lấy text
      const textData = await response.text();
      console.log('Non-JSON response:', textData);
      data = { message: textData || `HTTP ${response.status}` };
    }

    console.log('Response data:', data); // Debug log

    if (!response.ok) {
      // Xử lý các loại lỗi HTTP khác nhau
      let errorMessage = 'Kích hoạt tài khoản thất bại';
      
      if (response.status === 400) {
        console.log('400 Bad Request details:', data);
        if (data && data.message) {
          // Kiểm tra nếu tài khoản đã được kích hoạt - đây không phải là lỗi thực sự
          if (data.message.includes('đã được kích hoạt') || 
              data.message.includes('already activated') ||
              data.message.includes('already active')) {
            return {
              success: true, // Treat as success
              message: data.message,
              data: data
            };
          }
          errorMessage = data.message;
        } else {
          errorMessage = `Dữ liệu không hợp lệ. Email: ${cleanEmail}, Code: ${cleanCode.substring(0, 8)}...`;
        }
      } else if (response.status === 404) {
        errorMessage = 'Không tìm thấy tài khoản hoặc mã kích hoạt không đúng';
      } else if (response.status === 410) {
        errorMessage = 'Mã kích hoạt đã hết hạn';
      } else if (response.status === 409) {
        errorMessage = 'Tài khoản đã được kích hoạt trước đó';
      } else if (response.status === 500) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau';
      } else {
        errorMessage = data.message || `Lỗi HTTP ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    return {
      success: true,
      message: data.message || 'Kích hoạt tài khoản thành công!',
      data: data
    };
  } catch (error) {
    console.error('Active Account API Error:', error);
    
    // Xử lý network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi kích hoạt tài khoản'
    };
  }
};

// Helper function để parse URL parameters
export const parseActivationUrl = (url: string): { email?: string; activationCode?: string } => {
  try {
    const urlObj = new URL(url);
    const email = urlObj.searchParams.get('email');
    const activationCode = urlObj.searchParams.get('activationCode');
    
    return {
      email: email || undefined,
      activationCode: activationCode || undefined
    };
  } catch (error) {
    console.error('Error parsing activation URL:', error);
    return {};
  }
};

// Validation cho activation parameters
export const validateActivationParams = (email: string, activationCode: string): string[] => {
  const errors: string[] = [];
  
  console.log('Validating:', { email, activationCode }); // Debug log

  if (!email || !email.trim()) {
    errors.push('Email không được để trống');
  } else if (!isValidEmail(email.trim())) {
    errors.push(`Email không hợp lệ: ${email}`);
    console.log('Invalid email format:', email); // Debug log
  }

  if (!activationCode || !activationCode.trim()) {
    errors.push('Mã kích hoạt không được để trống');
  } else if (activationCode.trim().length < 10) {
    errors.push('Mã kích hoạt không hợp lệ (quá ngắn)');
    console.log('Invalid activation code length:', activationCode.length); // Debug log
  }

  console.log('Validation errors:', errors); // Debug log
  return errors;
};

// Helper function để validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function để decode email hoàn toàn
export const decodeEmailCompletely = (email: string): string => {
  let result = email.trim();
  
  console.log('Decoding email step by step:');
  console.log('1. Original:', result);
  
  // Thay thế %40 thành @
  if (result.includes('%40')) {
    result = result.replace(/%40/g, '@');
    console.log('2. After %40 replacement:', result);
  }
  
  // Decode URI components nếu còn ký tự %
  if (result.includes('%')) {
    try {
      const decoded = decodeURIComponent(result);
      console.log('3. After decodeURIComponent:', decoded);
      result = decoded;
    } catch (error) {
      console.warn('Failed to decode email:', error);
    }
  }
  
  console.log('4. Final result:', result);
  return result;
};

// Helper function để encode email cho URL mà không encode @ và .
export const encodeEmailForUrl = (email: string): string => {
  // Chỉ encode những ký tự cần thiết, giữ nguyên @ và .
  let result = email.trim();
  
  // Encode space thành %20 nếu có
  result = result.replace(/ /g, '%20');
  
  // Encode các ký tự đặc biệt khác nhưng giữ nguyên @ và .
  // Có thể thêm encoding cho các ký tự khác nếu cần
  result = result.replace(/\+/g, '%2B');
  result = result.replace(/&/g, '%26');
  result = result.replace(/=/g, '%3D');
  
  console.log('Email encoded for URL:', result);
  return result;
};
