import axios from 'axios';
import { API_BASE_URL } from '../API_BASE_URL';

// Interface cho Poster
export interface PosterDTO {
  idPoster: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  idUser: string;
  userName: string;
  userFirstName?: string;
  userLastName?: string;
  userAvatar?: string;
  privacyStatusName: string;
  imageUrls?: string[];
}

// Lấy tất cả posters
export const getAllPosters = async (): Promise<PosterDTO[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/posters`);
    return response.data;
  } catch (error) {
    console.error('Error fetching posters:', error);
    throw error;
  }
};

// Lấy posters visible cho user (respecting privacy)
export const getVisiblePosters = async (viewerId: string): Promise<PosterDTO[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/posters/feed/${viewerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching visible posters:', error);
    throw error;
  }
};

// Lấy posters theo user ID
export const getPostersByUserId = async (userId: string): Promise<PosterDTO[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/posters/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user posters:', error);
    throw error;
  }
};

// Lấy poster theo ID
export const getPosterById = async (posterId: string): Promise<PosterDTO> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/posters/${posterId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching poster:', error);
    throw error;
  }
};

// Tạo poster mới
export const createPoster = async (posterData: {
  idUser: string;
  content: string;
  privacyStatusName: string;
  imageUrls?: string[];
}): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/posters`, posterData);
    return response.data;
  } catch (error) {
    console.error('Error creating poster:', error);
    throw error;
  }
};

// Cập nhật poster
export const updatePoster = async (
  posterId: string,
  posterData: {
    idUser: string;
    content?: string;
    privacyStatusName?: string;
    imageUrls?: string[];
  }
): Promise<any> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/posters/${posterId}`, posterData);
    return response.data;
  } catch (error) {
    console.error('Error updating poster:', error);
    throw error;
  }
};

// Xóa poster
export const deletePoster = async (posterId: string, userId: string): Promise<any> => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/posters/${posterId}`, {
      data: { idUser: userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting poster:', error);
    throw error;
  }
};
