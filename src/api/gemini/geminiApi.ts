// Gemini AI API
import { API_BASE_URL } from '../API_BASE_URL';
import { getToken } from '../util/JwtService';

// 

export interface GeminiRequest {
  prompt: string;
}

export interface GeminiResponse {
  response?: string;
  message?: string;
  error?: string;
}

/**
 * Gửi câu hỏi đến Gemini AI
 * @param prompt Câu hỏi/yêu cầu của người dùng
 * @returns Phản hồi từ Gemini AI
 */
export const askGemini = async (prompt: string): Promise<string> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_BASE_URL}/gemini/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Kiểm tra content type
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const jsonResult: GeminiResponse = await response.json();
      return jsonResult.response || jsonResult.message || 'Không có phản hồi từ AI';
    } else {
      // Nếu trả về text thuần
      const textResult = await response.text();
      return textResult || 'Không có phản hồi từ AI';
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

/**
 * Kiểm tra prompt có hợp lệ không
 */
export const validatePrompt = (prompt: string): string | null => {
  if (!prompt || prompt.trim() === '') {
    return 'Vui lòng nhập câu hỏi';
  }
  
  if (prompt.trim().length < 2) {
    return 'Câu hỏi quá ngắn';
  }
  
  if (prompt.length > 2000) {
    return 'Câu hỏi quá dài (tối đa 2000 ký tự)';
  }
  
  return null;
};
