export interface JwtPayload {
  id: string;
  sub: string; // username
  role: string;
  avatar: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  iat: number; // issued at
  exp: number; // expiration
}

// JWT decode helper (Base64Url -> Base64 -> JSON)
const base64UrlDecode = (str: string): string => {
  // Replace non-url compatible chars with base64 standard chars
  let output = str.replace(/-/g, '+').replace(/_/g, '/');

  // Pad with '=' if not a multiple of 4
  const pad = output.length % 4;
  if (pad) {
    output += '='.repeat(4 - pad);
  }

  return atob(output);
};

export const decodeJWT = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token');
    }
    
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload as JwtPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Token storage management
export const saveToken = (token: string): void => {
  localStorage.setItem('token', token);
  console.log('Token saved successfully');
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
  console.log('Token removed');
};

export const isTokenExists = (): boolean => {
  const token = getToken();
  return token !== null && token !== '';
};

// Token validation
export const isTokenExpired = (token?: string): boolean => {
  const tokenToCheck = token || getToken();
  if (!tokenToCheck) return true;
  
  const payload = decodeJWT(tokenToCheck);
  if (!payload || !payload.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= payload.exp;
};

export const isTokenValid = (): boolean => {
  return isTokenExists() && !isTokenExpired();
};

// User info extraction
export const getUserFromToken = (token?: string): JwtPayload | null => {
  const tokenToUse = token || getToken();
  if (!tokenToUse) return null;
  
  return decodeJWT(tokenToUse);
};

export const getUserInfo = (): { 
  id?: string, 
  username?: string, 
  role?: string, 
  avatar?: string,
  firstName?: string,
  lastName?: string,
  enabled?: boolean 
} | null => {
  const payload = getUserFromToken();
  if (!payload) return null;
  
  return {
    id: payload.id,
    username: payload.sub, // JWT standard field for subject (username)
    role: payload.role,
    avatar: payload.avatar,
    firstName: payload.firstName,
    lastName: payload.lastName,
    enabled: payload.enabled
  };
};

// Get just the user ID
export const getUserId = (): string | null => {
  const payload = getUserFromToken();
  return payload?.id || null;
};