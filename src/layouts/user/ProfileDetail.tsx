import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios"; // still used for initial fetch only
import { useParams, useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Clock,
  Hash,
  Edit,
  Save,
  X,
  Users,
  MessageCircle,
  MoreHorizontal,
  UserPlus,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { getUserInfo } from '../../api/user/loginApi';
import { changeAvatar } from '../../api/user/avatarApi';
import { updateUserProfile, UpdateProfileRequest as UpdateProfilePayload } from '../../api/user/profileApi';
import { getPostersByUserId, PosterDTO, deletePoster } from '../../api/poster/posterApi';
import { likePoster, unlikePoster, getTotalLikes, checkUserLikedPoster, setUserLikedPoster } from '../../api/poster/likeApi';
import { getCommentsByPosterId, formatCommentTime, countTotalComments, createComment, replyToComment, updateComment, deleteComment, type Comment } from '../../api/poster/commentApi';
import { getUserById } from '../../api/user/userApi';
import { getFriendsList, sendFriendRequest } from '../../api/user/friendshipApi';
import ImageViewer from '../../components/ImageViewer';
import "./ProfileDetail.css";
import "../TrangChu/Home.css"; // Import Home.css for post styles
import Header from "../header-footer/Header";

interface UserDetail {
  idUser: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  avatar: string;
  status: boolean;
  enabled: boolean;
  gender: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileRequest {
  idUser: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: boolean;
}

const ProfileDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateProfileRequest>({
    idUser: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: true,
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  // Avatar change states
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [toasts, setToasts] = useState<Array<{id:number; type:'success'|'error'; text:string}>>([]);
  const toastIdRef = useRef(0);

  // Posters for profile
  const [posters, setPosters] = useState<PosterDTO[]>([]);
  const [postersLoading, setPostersLoading] = useState(true);
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  // Like state
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikedPosts, setUserLikedPosts] = useState<Record<string, boolean>>({});
  const [likingInProgress, setLikingInProgress] = useState<Record<string, boolean>>({});
  
  // Comment state
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<Record<string, string>>({}); // commentId -> postId
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({}); // commentId -> content
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({}); // commentId -> loading
  
  // Edit state
  const [editingComment, setEditingComment] = useState<Record<string, string>>({}); // commentId -> postId
  const [editInputs, setEditInputs] = useState<Record<string, string>>({}); // commentId -> content
  const [submittingEdit, setSubmittingEdit] = useState<Record<string, boolean>>({}); // commentId -> loading
  
  // Post menu state
  const [showPostMenu, setShowPostMenu] = useState<Record<string, boolean>>({}); // postId -> boolean
  
  // Friendship state
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  
  const currentUserRef = useRef<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        const res = await axios.get<UserDetail>(
          `http://localhost:8080/api/users/search/findByIdUser?IdUser=${id}`
        );
        setUser(res.data);
        
        // Check if this is current user's profile (no login required for viewing)
        const currentUser = getUserInfo(); // May return null if not logged in
        const isOwn = currentUser?.id === id;
        setIsOwnProfile(isOwn);
        
        // Initialize edit data only for own profile
        if (isOwn) {
          setEditData({
            idUser: res.data.idUser,
            firstName: res.data.firstName || '',
            lastName: res.data.lastName || '',
            phoneNumber: res.data.phoneNumber || '',
            dateOfBirth: formatDateForAPI(res.data.dateOfBirth || ''),
            gender: res.data.gender,
          });
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  // Check friendship status
  useEffect(() => {
    const checkFriendship = async () => {
      if (!id || isOwnProfile) {
        setIsFriend(false);
        return;
      }
      
      const currentUser = getUserInfo();
      if (!currentUser?.id) {
        setIsFriend(false);
        return;
      }
      
      setFriendshipLoading(true);
      try {
        const friendsList = await getFriendsList();
        const isAlreadyFriend = friendsList.some(friend => friend.userId === id);
        setIsFriend(isAlreadyFriend);
      } catch (error) {
        console.error('Error checking friendship:', error);
        setIsFriend(false);
      } finally {
        setFriendshipLoading(false);
      }
    };
    
    checkFriendship();
  }, [id, isOwnProfile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Ensure we get YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenderChange = (gender: boolean) => {
    setEditData(prev => ({
      ...prev,
      gender,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMessage({ type: '', text: '' });
    // Reset edit data
    if (user) {
      setEditData({
        idUser: user.idUser,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: formatDateForAPI(user.dateOfBirth || ''),
        gender: user.gender,
      });
    }
  };

  // Avatar handlers
  const triggerAvatarSelect = () => {
    if (!isOwnProfile) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFieldErrors({});
    // Validation
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận PNG, JPG, GIF, WEBP.' });
      return;
    }
    const maxSizeMB = 2;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setMessage({ type: 'error', text: `Kích thước ảnh quá lớn (> ${maxSizeMB}MB).` });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      setIsChangingAvatar(true);
      setMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleCancelAvatar = () => {
    setIsChangingAvatar(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    try {
      setAvatarUploading(true);
      setMessage({ type: '', text: '' });
      // avatarPreview is already a data URL
      const dataUrl = avatarPreview!;
      const res = await changeAvatar(user.idUser, dataUrl);
      if (res.success) {
        setUser(prev => prev ? { ...prev, avatar: res.avatar || dataUrl } : prev);
        pushToast('success','Cập nhật avatar thành công!');
        handleCancelAvatar();
      } else {
        pushToast('error', res.message || 'Đổi avatar thất bại');
        if (res.message.includes('401') || res.message.includes('Unauthorized')) {
          setTimeout(() => {
            if (window.confirm('Phiên đăng nhập đã hết hạn. Bạn có muốn đăng nhập lại không?')) {
              window.location.href = '/login';
            }
          }, 300);
        }
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Đổi avatar thất bại' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setUpdateLoading(true);
    setMessage({ type: '', text: '' });
    setFieldErrors({});

    try {
      // Basic validations
      const errors: Record<string,string> = {};
      if (!editData.firstName.trim()) errors.firstName = 'Họ không được để trống';
      if (!editData.lastName.trim()) errors.lastName = 'Tên không được để trống';
      const phonePattern = /^(0|\+84)[3-9][0-9]{8}$/;
      if (editData.phoneNumber && !phonePattern.test(editData.phoneNumber)) errors.phoneNumber = 'Số điện thoại không hợp lệ';
      const dob = formatDateForAPI(editData.dateOfBirth);
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) errors.dateOfBirth = 'Ngày sinh không hợp lệ';
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        throw new Error('Vui lòng sửa các lỗi được đánh dấu');
      }

      const payload: UpdateProfilePayload = {
        idUser: editData.idUser,
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        phoneNumber: editData.phoneNumber.trim(),
        dateOfBirth: dob,
        gender: editData.gender
      };

      console.log('Sending data to API (PUT):', payload);
      const result = await updateUserProfile(payload);
      if (!result.success) throw new Error(result.message);

      pushToast('success','Cập nhật thông tin thành công!');
      setIsEditing(false);
      setUser(prev => prev ? { ...prev, ...payload } : null);
    } catch (error: any) {
      console.error('Update profile error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || error.response?.data?.message || 'Cập nhật thông tin thất bại' 
      });
      if (!fieldErrors || Object.keys(fieldErrors).length===0) {
        // nếu lỗi tổng quát -> toast
        pushToast('error', error.message || 'Cập nhật thất bại');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  // Toast helpers
  const pushToast = (type:'success'|'error', text:string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev,{id,type,text}]);
    setTimeout(()=>dismissToast(id), 3800);
  };
  const dismissToast = (id:number) => {
    setToasts(prev => prev.filter(t=>t.id!==id));
  };

  const fullName = useMemo(() => {
    if (!user) return "";
    const merged = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return merged || user.username;
  }, [user]);

  const aboutItems = useMemo(
    () => {
      if (!user) return [];
      
      // Base info visible to everyone
      const publicInfo = [
        { icon: UserIcon, label: "Họ và tên", value: fullName || "Chưa cập nhật" },
        { icon: Hash, label: "Tên người dùng", value: user.username ? `@${user.username}` : "Chưa cập nhật" },
        { icon: UserIcon, label: "Giới tính", value: user.gender ? "Nam" : "Nữ" },
      ];

      // Additional private info only for own profile
      if (isOwnProfile) {
        publicInfo.push(
          { icon: Mail, label: "Email", value: user.email || "Chưa cập nhật" },
          { icon: Phone, label: "Điện thoại", value: user.phoneNumber || "Chưa cập nhật" },
          { icon: Calendar, label: "Ngày sinh", value: user.dateOfBirth || "Chưa cập nhật" },
          { icon: ShieldCheck, label: "Tài khoản", value: user.status ? "Đã xác thực" : "Chưa xác thực" },
          { icon: Clock, label: "Ngày tạo", value: formatDate(user.createdAt) },
          { icon: Clock, label: "Cập nhật cuối", value: formatDate(user.updatedAt) }
        );
      }

      return publicInfo;
    },
    [user, fullName, isOwnProfile]
  );

  const friendCount = useMemo(() => Math.max(0, Math.round(Math.random() * 200 + 150)), []);
  const mutualFriends = useMemo(() => Math.max(4, Math.round(Math.random() * 20)), []);

  // Handler: Send friend request
  const handleSendFriendRequest = async () => {
    if (!id) return;
    
    const currentUser = getUserInfo();
    if (!currentUser?.id) {
      alert('Vui lòng đăng nhập để thêm bạn bè');
      return;
    }

    setSendingFriendRequest(true);
    try {
      const success = await sendFriendRequest(id);
      if (success) {
        pushToast('success', 'Đã gửi lời mời kết bạn!');
        // Optionally: could set some state to show "Đã gửi lời mời" instead of button
      } else {
        pushToast('error', 'Không thể gửi lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      pushToast('error', 'Có lỗi xảy ra khi gửi lời mời');
    } finally {
      setSendingFriendRequest(false);
    }
  };

  // Fetch posters for this profile
  useEffect(() => {
    const fetchPosters = async () => {
      if (!id) return;
      setPostersLoading(true);
      try {
        const currentUser = getUserInfo();
        currentUserRef.current = currentUser;
        
        const res = await getPostersByUserId(id);
        // Filter posters based on privacy if not own profile
        let filteredPosters = res || [];
        if (!isOwnProfile) {
          // Check if current user is friends with profile owner
          let isFriend = false;
          if (currentUser?.id) {
            try {
              const friendsList = await getFriendsList();
              isFriend = friendsList.some(friend => friend.userId === id);
            } catch (error) {
              console.error('Error checking friendship:', error);
            }
          }
          
          // Filter based on friendship status
          if (isFriend) {
            // Friends can see PUBLIC and FRIENDS posts
            filteredPosters = filteredPosters.filter(p => 
              p.privacyStatusName === 'PUBLIC' || p.privacyStatusName === 'FRIENDS'
            );
          } else {
            // Non-friends only see PUBLIC posts
            filteredPosters = filteredPosters.filter(p => p.privacyStatusName === 'PUBLIC');
          }
        }
        setPosters(filteredPosters);
        
        // Fetch like counts for all posts
        const likeCountsData: Record<string, number> = {};
        const userLikedData: Record<string, boolean> = {};
        
        await Promise.all(
          filteredPosters.map(async (poster) => {
            try {
              const count = await getTotalLikes(poster.idPoster);
              likeCountsData[poster.idPoster] = count;
              
              // Check if current user liked this post
              if (currentUser?.id) {
                userLikedData[poster.idPoster] = checkUserLikedPoster(poster.idPoster, currentUser.id);
              }
            } catch (error) {
              console.error(`❌ Error fetching likes for post ${poster.idPoster}:`, error);
              likeCountsData[poster.idPoster] = 0;
              userLikedData[poster.idPoster] = false;
            }
          })
        );
        
        setLikeCounts(likeCountsData);
        setUserLikedPosts(userLikedData);
        
        // Fetch comment counts for all posts
        const commentCountsData: Record<string, number> = {};
        await Promise.all(
          filteredPosters.map(async (poster) => {
            try {
              const postComments = await getCommentsByPosterId(poster.idPoster);
              const totalCount = countTotalComments(postComments);
              commentCountsData[poster.idPoster] = totalCount;
            } catch (error) {
              console.error(`❌ Error fetching comments for post ${poster.idPoster}:`, error);
              commentCountsData[poster.idPoster] = 0;
            }
          })
        );
        
        setCommentCounts(commentCountsData);
      } catch (e) {
        console.error('Error fetching posters for profile:', e);
      } finally {
        setPostersLoading(false);
      }
    };

    fetchPosters();
  }, [id, isOwnProfile]);

  // Handler functions - copied from Home.tsx
  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) {
      return;
    }

    try {
      await deletePoster(postId, authorId);
      // Remove from local state
      setPosters(prev => prev.filter(p => p.idPoster !== postId));
      console.log('✅ Poster deleted successfully');
    } catch (err: any) {
      console.error('Error deleting poster:', err);
      alert(err.response?.data?.message || 'Không thể xóa bài đăng');
    }
  };

  const handleLikeToggle = async (postId: string) => {
    const currentUser = currentUserRef.current;
    if (!currentUser?.id) {
      alert('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    if (likingInProgress[postId]) {
      return;
    }

    const isCurrentlyLiked = userLikedPosts[postId] || false;
    const currentCount = likeCounts[postId] || 0;

    // Optimistic update
    setUserLikedPosts(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLikeCounts(prev => ({ 
      ...prev, 
      [postId]: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1 
    }));
    setLikingInProgress(prev => ({ ...prev, [postId]: true }));

    try {
      let success = false;
      if (isCurrentlyLiked) {
        success = await unlikePoster(postId, currentUser.id);
        if (success) {
          setUserLikedPoster(postId, currentUser.id, false);
        }
      } else {
        success = await likePoster(postId, currentUser.id);
        if (success) {
          setUserLikedPoster(postId, currentUser.id, true);
        }
      }

      if (!success) {
        setUserLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
        setLikeCounts(prev => ({ ...prev, [postId]: currentCount }));
      } else {
        const newCount = await getTotalLikes(postId);
        setLikeCounts(prev => ({ ...prev, [postId]: newCount }));
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      setUserLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikeCounts(prev => ({ ...prev, [postId]: currentCount }));
    } finally {
      setLikingInProgress(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleComments = async (postId: string) => {
    const isCurrentlyShown = showComments[postId] || false;
    
    if (isCurrentlyShown) {
      setShowComments(prev => ({ ...prev, [postId]: false }));
    } else {
      if (!comments[postId]) {
        setLoadingComments(prev => ({ ...prev, [postId]: true }));
        try {
          const postComments = await getCommentsByPosterId(postId);
          const enrichedComments = await enrichCommentsWithUserData(postComments);
          setComments(prev => ({ ...prev, [postId]: enrichedComments }));
        } catch (error) {
          console.error('❌ Error loading comments:', error);
        } finally {
          setLoadingComments(prev => ({ ...prev, [postId]: false }));
        }
      }
      setShowComments(prev => ({ ...prev, [postId]: true }));
    }
  };

  const enrichCommentsWithUserData = async (commentList: Comment[]): Promise<Comment[]> => {
    const userCache: Record<string, any> = {};
    
    const enrichComment = async (comment: Comment): Promise<Comment> => {
      if (!userCache[comment.idUser]) {
        try {
          const userData = await getUserById(comment.idUser);
          userCache[comment.idUser] = userData;
        } catch (error) {
          console.error(`Error fetching user ${comment.idUser}:`, error);
          userCache[comment.idUser] = null;
        }
      }
      
      const user = userCache[comment.idUser];
      const enrichedComment = {
        ...comment,
        userName: user?.username || 'Người dùng',
        userAvatar: user?.avatar || '',
        userFirstName: user?.firstName || '',
        userLastName: user?.lastName || ''
      };
      
      if (comment.replies && comment.replies.length > 0) {
        enrichedComment.replies = await Promise.all(
          comment.replies.map(reply => enrichComment(reply))
        );
      }
      
      return enrichedComment;
    };
    
    return Promise.all(commentList.map(enrichComment));
  };

  const handleSubmitComment = async (postId: string) => {
    const currentUser = currentUserRef.current;
    if (!currentUser?.id) {
      alert('Vui lòng đăng nhập để bình luận');
      return;
    }

    const content = commentInputs[postId]?.trim();
    if (!content) return;

    setSubmittingComment(prev => ({ ...prev, [postId]: true }));

    try {
      const newComment = await createComment(postId, currentUser.id, content);
      
      if (newComment) {
        const userData = await getUserById(currentUser.id);
        const enrichedComment: Comment = {
          ...newComment,
          userName: userData?.username || currentUser.username || 'Người dùng',
          userAvatar: userData?.avatar || currentUser.avatar || '',
          userFirstName: userData?.firstName || currentUser.firstName || '',
          userLastName: userData?.lastName || currentUser.lastName || '',
          replies: [],
          replyCount: 0
        };

        setComments(prev => ({
          ...prev,
          [postId]: [enrichedComment, ...(prev[postId] || [])]
        }));

        setCommentCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }));

        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setShowComments(prev => ({ ...prev, [postId]: true }));
      }
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      alert('Có lỗi xảy ra khi thêm bình luận.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleReply = (commentId: string, postId: string) => {
    setReplyingTo(prev => {
      const current = prev[commentId];
      if (current) {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      } else {
        return { ...prev, [commentId]: postId };
      }
    });
  };

  const handleSubmitReply = async (postId: string, parentCommentId: string) => {
    const currentUser = currentUserRef.current;
    if (!currentUser?.id) {
      alert('Vui lòng đăng nhập để trả lời bình luận');
      return;
    }

    const content = replyInputs[parentCommentId]?.trim();
    if (!content) return;

    setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));

    try {
      const newReply = await replyToComment(postId, parentCommentId, currentUser.id, content);
      
      if (newReply) {
        const userData = await getUserById(currentUser.id);
        const enrichedReply: Comment = {
          ...newReply,
          userName: userData?.username || currentUser.username || 'Người dùng',
          userAvatar: userData?.avatar || currentUser.avatar || '',
          userFirstName: userData?.firstName || currentUser.firstName || '',
          userLastName: userData?.lastName || currentUser.lastName || '',
          replies: [],
          replyCount: 0
        };

        setComments(prev => {
          const postComments = [...(prev[postId] || [])];
          const updateCommentReplies = (commentsList: Comment[]): Comment[] => {
            return commentsList.map(comment => {
              if (comment.idComment === parentCommentId) {
                return {
                  ...comment,
                  replies: [enrichedReply, ...(comment.replies || [])],
                  replyCount: (comment.replyCount || 0) + 1
                };
              } else if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentReplies(comment.replies)
                };
              }
              return comment;
            });
          };

          return {
            ...prev,
            [postId]: updateCommentReplies(postComments)
          };
        });

        setCommentCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }));

        setReplyInputs(prev => {
          const newState = { ...prev };
          delete newState[parentCommentId];
          return newState;
        });
        setReplyingTo(prev => {
          const newState = { ...prev };
          delete newState[parentCommentId];
          return newState;
        });
      }
    } catch (error) {
      console.error('❌ Error submitting reply:', error);
      alert('Có lỗi xảy ra khi thêm phản hồi.');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
    }
  };

  const handleToggleEdit = (commentId: string, postId: string, currentContent: string) => {
    setEditingComment(prev => {
      const current = prev[commentId];
      if (current) {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      } else {
        setEditInputs(prevInputs => ({ ...prevInputs, [commentId]: currentContent }));
        return { ...prev, [commentId]: postId };
      }
    });
  };

  const handleSubmitEdit = async (postId: string, commentId: string) => {
    const currentUser = currentUserRef.current;
    if (!currentUser?.id) {
      alert('Vui lòng đăng nhập để sửa bình luận');
      return;
    }

    const content = editInputs[commentId]?.trim();
    if (!content) return;

    setSubmittingEdit(prev => ({ ...prev, [commentId]: true }));

    try {
      const updatedComment = await updateComment(postId, commentId, currentUser.id, content);
      
      if (updatedComment) {
        setComments(prev => {
          const postComments = [...(prev[postId] || [])];
          const updateCommentContent = (commentsList: Comment[]): Comment[] => {
            return commentsList.map(comment => {
              if (comment.idComment === commentId) {
                return {
                  ...comment,
                  content: updatedComment.content,
                  updatedAt: updatedComment.updatedAt
                };
              } else if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentContent(comment.replies)
                };
              }
              return comment;
            });
          };

          return {
            ...prev,
            [postId]: updateCommentContent(postComments)
          };
        });

        setEditInputs(prev => {
          const newState = { ...prev };
          delete newState[commentId];
          return newState;
        });
        setEditingComment(prev => {
          const newState = { ...prev };
          delete newState[commentId];
          return newState;
        });
      }
    } catch (error) {
      console.error('❌ Error updating comment:', error);
      alert('Có lỗi xảy ra khi cập nhật bình luận.');
    } finally {
      setSubmittingEdit(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const currentUser = currentUserRef.current;
    if (!currentUser?.id) {
      alert('Vui lòng đăng nhập để xóa bình luận');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      return;
    }

    try {
      const success = await deleteComment(postId, commentId, currentUser.id);
      
      if (success) {
        setComments(prev => {
          const postComments = [...(prev[postId] || [])];
          const removeComment = (commentsList: Comment[]): Comment[] => {
            return commentsList.filter(comment => {
              if (comment.idComment === commentId) {
                return false;
              } else if (comment.replies && comment.replies.length > 0) {
                comment.replies = removeComment(comment.replies);
              }
              return true;
            });
          };

          return {
            ...prev,
            [postId]: removeComment(postComments)
          };
        });

        setCommentCounts(prev => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] || 0) - 1)
        }));
      }
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      alert('Có lỗi xảy ra khi xóa bình luận.');
    }
  };

  // Image viewer handlers
  const openImageViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const closeImageViewer = () => {
    setViewerOpen(false);
  };

  const nextImage = () => {
    setViewerIndex(prev => Math.min(prev + 1, viewerImages.length - 1));
  };

  const prevImage = () => {
    setViewerIndex(prev => Math.max(prev - 1, 0));
  };

  // Toggle post menu
  const handleTogglePostMenu = (postId: string) => {
    setShowPostMenu(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Close post menu when clicking outside
  const handleClosePostMenu = (postId: string) => {
    setShowPostMenu(prev => ({
      ...prev,
      [postId]: false
    }));
  };

  // Handle edit post
  const handleEditPost = (postId: string) => {
    handleClosePostMenu(postId);
    navigate(`/poster/${postId}/edit`);
  };

  // Handle delete post with menu close
  const handleDeletePostWithMenu = async (postId: string, authorId: string) => {
    handleClosePostMenu(postId);
    await handleDeletePost(postId, authorId);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">⏳ Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <div className="error-message">
          <p>❌ Không tìm thấy người dùng</p>
          <a href="/" className="back-link">← Quay lại trang chủ</a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* <Header /> */}
      <div className="fb-profile">
        <div className="toast-container" aria-live="polite" aria-atomic="true">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert">
              <div className="toast__text">{t.text}</div>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismissToast(t.id)}
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

      <div className="fb-profile__cover">
        <div className="fb-profile__cover-image" />
        {isOwnProfile && (
          <button type="button" className="fb-btn fb-btn--cover">
            <ImageIcon size={16} />
            <span>Chỉnh sửa ảnh bìa</span>
          </button>
        )}
      </div>

      <div className="fb-profile__top">
        <div className="fb-profile__avatar-col">
          <div className="avatar-container">
            <img
              src={
                avatarPreview
                  ? avatarPreview
                  : user.avatar && user.avatar.trim() !== ""
                  ? user.avatar
                  : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s"
              }
              alt="Ảnh đại diện"
              className={"avatar" + (isOwnProfile ? " avatar-hover" : "")}
              onClick={triggerAvatarSelect}
              title={isOwnProfile ? "Nhấp để đổi avatar" : ""}
            />
            {isOwnProfile && (
              <div className={`avatar-overlay ${avatarUploading ? "avatar-uploading" : ""}`}>
                {avatarUploading ? <div className="avatar-progress" /> : <span>{isChangingAvatar ? "Lưu hoặc huỷ" : "Đổi ảnh"}</span>}
              </div>
            )}
            {isOwnProfile && !isChangingAvatar && (
              <button type="button" className="avatar-change-btn" onClick={triggerAvatarSelect}>
                Đổi
              </button>
            )}
            {isChangingAvatar && (
              <div className="avatar-actions">
                <button type="button" disabled={avatarUploading} onClick={handleUploadAvatar} className="save-avatar-btn">
                  {avatarUploading ? "Đang lưu..." : "Lưu"}
                </button>
                <button type="button" disabled={avatarUploading} onClick={handleCancelAvatar} className="cancel-avatar-btn">
                  Hủy
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="visually-hidden"
              aria-labelledby="avatar-upload"
              title="Chọn ảnh đại diện"
              placeholder="Chọn ảnh đại diện"
              onChange={handleAvatarFileChange}
            />
            <div className={`status-indicator ${user.status ? "status-online" : "status-offline"}`} />
          </div>
        </div>
        <div className="fb-profile__info-col">
          <h1 className="fb-profile__name">{fullName}</h1>
          <div className="fb-profile__meta">
            {/* <span className="fb-profile__username">{user.username}</span> */}
            <span className="fb-profile__friends">
              <Users size={16} />
              <span>{friendCount.toLocaleString("vi-VN")} bạn bè</span>
              <span className="dot">•</span>
              <span>{mutualFriends} bạn chung</span>
            </span>
          </div>
          <div className="fb-profile__badges">
            <span className={`fb-badge ${user.enabled ? "fb-badge--success" : "fb-badge--danger"}`}>
              {user.enabled ? "Hoạt động" : "Khóa"}
            </span>
            <span className="fb-badge fb-badge--muted">{user.gender ? "Nam" : "Nữ"}</span>
          </div>
        </div>
        <div className="fb-profile__actions">
          {isOwnProfile ? (
            <div className="fb-profile__action-group">
              {!isEditing ? (
                <button type="button" className="fb-btn fb-btn--primary" onClick={handleEdit}>
                  <Edit size={16} />
                  <span>Chỉnh sửa trang cá nhân</span>
                </button>
              ) : (
                <div className="fb-profile__action-edit">
                  <button type="button" className="fb-btn fb-btn--primary" onClick={handleSave} disabled={updateLoading}>
                    <Save size={16} />
                    <span>{updateLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
                  </button>
                  <button type="button" className="fb-btn fb-btn--light" onClick={handleCancel}>
                    <X size={16} />
                    <span>Hủy</span>
                  </button>
                </div>
              )}
              <button type="button" className="fb-btn fb-btn--light">
                <Plus size={16} />
                <span>Thêm vào tin</span>
              </button>
            </div>
          ) : (
            <div className="fb-profile__action-group">
              {!friendshipLoading && !isFriend && (
                <button 
                  type="button" 
                  className="fb-btn fb-btn--primary"
                  onClick={handleSendFriendRequest}
                  disabled={sendingFriendRequest}
                >
                  <UserPlus size={16} />
                  <span>{sendingFriendRequest ? 'Đang gửi...' : 'Thêm bạn bè'}</span>
                </button>
              )}
              {!friendshipLoading && isFriend && (
                <button type="button" className="fb-btn fb-btn--secondary">
                  <Users size={16} />
                  <span>Bạn bè</span>
                </button>
              )}
              <button type="button" className="fb-btn fb-btn--secondary">
                <MessageCircle size={16} />
                <span>Nhắn tin</span>
              </button>
              <button type="button" className="fb-btn fb-btn--icon" aria-label="Tùy chọn khác">
                <MoreHorizontal size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fb-profile__tabs" role="tablist">
        <button type="button" className="fb-profile__tab fb-profile__tab--active" role="tab" aria-selected="true">
          Bài viết
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Chi tiết về Dương Thuận Tri
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Bạn bè
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Ảnh
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Video
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Xem thêm
        </button>
      </div>

      <div className="fb-profile__layout">
        <aside className="fb-profile__sidebar">
          {isEditing ? (
            <div className="fb-card fb-profile__edit-card">
              <div className="fb-card__header">
                <h2>Chỉnh sửa thông tin</h2>
              </div>
              <div className="fb-profile__edit-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-first-name">Họ</label>
                    <input
                      id="profile-first-name"
                      type="text"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.firstName ? " error" : ""}`}
                      placeholder="Nhập họ của bạn"
                      title="Họ"
                    />
                    {fieldErrors.firstName && <div className="field-error">{fieldErrors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-last-name">Tên</label>
                    <input
                      id="profile-last-name"
                      type="text"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.lastName ? " error" : ""}`}
                      placeholder="Nhập tên của bạn"
                      title="Tên"
                    />
                    {fieldErrors.lastName && <div className="field-error">{fieldErrors.lastName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-phone-number">Số điện thoại</label>
                    <input
                      id="profile-phone-number"
                      type="tel"
                      name="phoneNumber"
                      value={editData.phoneNumber}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.phoneNumber ? " error" : ""}`}
                      placeholder="0909123456"
                      title="Số điện thoại"
                    />
                    {fieldErrors.phoneNumber && <div className="field-error">{fieldErrors.phoneNumber}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-dob">Ngày sinh</label>
                    <input
                      id="profile-dob"
                      type="date"
                      name="dateOfBirth"
                      value={formatDateForInput(editData.dateOfBirth)}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.dateOfBirth ? " error" : ""}`}
                    />
                    {fieldErrors.dateOfBirth && <div className="field-error">{fieldErrors.dateOfBirth}</div>}
                  </div>
                  <div className="form-group">
                    <span className="form-label">Giới tính</span>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          checked={editData.gender === true}
                          onChange={() => handleGenderChange(true)}
                        />
                        <span>Nam</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          checked={editData.gender === false}
                          onChange={() => handleGenderChange(false)}
                        />
                        <span>Nữ</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="fb-profile__edit-actions">
                  <button type="button" className="fb-btn fb-btn--primary" onClick={handleSave} disabled={updateLoading}>
                    {updateLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button type="button" className="fb-btn fb-btn--light" onClick={handleCancel} disabled={updateLoading}>
                    Hủy
                  </button>
                </div>
                {message.text && <div className={`profile-message ${message.type}`}>{message.text}</div>}
              </div>
            </div>
          ) : (
            <div className="fb-card fb-profile__about-card">
              <div className="fb-card__header">
                <h2>Giới thiệu</h2>
                {isOwnProfile && (
                  <button type="button" className="fb-link-button" onClick={handleEdit}>
                    Chỉnh sửa
                  </button>
                )}
              </div>
              <ul className="fb-profile__about-list">
                {aboutItems.map(item => (
                  <li key={item.label}>
                    <item.icon size={18} />
                    <div>
                      <span className="label">{item.label}</span>
                      <span className="value">{item.value || "Chưa cập nhật"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          

          {/* <section className="fb-card fb-profile__photos">
            <div className="fb-card__header">
              <h2>Ảnh</h2>
              <button type="button" className="fb-link-button">Xem tất cả</button>
            </div>
            <div className="fb-photos-grid">
              {samplePhotos.map((photo, index) => (
                <img key={index} src={photo} alt={`Ảnh ${index + 1}`} />
              ))}
            </div>
          </section>

          <section className="fb-card fb-profile__friends">
            <div className="fb-card__header">
              <h2>Bạn bè</h2>
              <span>{friendCount.toLocaleString("vi-VN")} người bạn</span>
            </div>
            <div className="fb-friends-grid">
              {sampleFriends.map(friend => (
                <div key={friend.id} className="fb-friend">
                  <img src={friend.avatar} alt={friend.name} />
                  <span>{friend.name}</span>
                </div>
              ))}
            </div>
          </section> */}
        </aside>

        <section className="fb-profile__main">
          {isOwnProfile && (
            <div className="fb-card fb-profile__composer">
              <div className="fb-profile__composer-top">
                <img
                  src={
                    avatarPreview
                      ? avatarPreview
                      : user.avatar && user.avatar.trim() !== ""
                      ? user.avatar
                      : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s"
                  }
                  alt="Ảnh đại diện của bạn"
                />
                <button type="button">Bạn đang nghĩ gì thế?</button>
              </div>
              <div className="fb-profile__composer-actions">
                <button type="button">🎥 Video trực tiếp</button>
                <button type="button">📷 Ảnh/video</button>
                <button type="button">😊 Cảm xúc/hoạt động</button>
              </div>
            </div>
          )}

          

          <div className="fb-profile__posts">
            {postersLoading ? (
              <div className="loading-text">⏳ Đang tải bài viết...</div>
            ) : posters.length === 0 ? (
              <div className="empty-state">Chưa có bài viết nào.</div>
            ) : (
              posters.map(poster => {
                const postId = poster.idPoster;
                const getFullName = () => {
                  if (poster.userFirstName && poster.userLastName) {
                    return `${poster.userFirstName} ${poster.userLastName}`;
                  }
                  return poster.userName || 'Người dùng';
                };
                
                const getTimeAgo = () => {
                  const createdDate = new Date(poster.createdAt);
                  const now = new Date();
                  const diffInMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));
                  
                  if (diffInMinutes < 60) {
                    return `${diffInMinutes} phút trước`;
                  } else if (diffInMinutes < 1440) {
                    return `${Math.floor(diffInMinutes / 60)} giờ trước`;
                  } else {
                    return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
                  }
                };

                const getAudienceLabel = () => {
                  if (poster.privacyStatusName === 'PUBLIC') return '🌍 Công khai';
                  if (poster.privacyStatusName === 'FRIENDS') return '👥 Bạn bè';
                  if (poster.privacyStatusName === 'PRIVATE') return '🔒 Chỉ mình tôi';
                  return poster.privacyStatusName;
                };

                return (
                  <article key={postId} className="fb-post">
                    <header className="fb-post__header">
                      <img 
                        src={poster.userAvatar || user?.avatar || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s'} 
                        alt={getFullName()}
                      />
                      <div>
                        <strong>{getFullName()}</strong>
                        <div className="fb-post__meta">
                          <span>{getTimeAgo()}</span>
                          <span aria-hidden="true">·</span>
                          <span>{getAudienceLabel()}</span>
                        </div>
                      </div>
                      
                      {/* Post menu - only show for post owner */}
                      {currentUserRef.current && poster.idUser === currentUserRef.current.id && (
                        <div className="fb-post__menu-wrapper">
                          <button 
                            className="fb-post__more" 
                            aria-label="Tùy chọn bài viết"
                            onClick={() => handleTogglePostMenu(postId)}
                          >
                            ⋯
                          </button>
                          
                          {showPostMenu[postId] && (
                            <>
                              <div 
                                className="fb-post__menu-overlay"
                                onClick={() => handleClosePostMenu(postId)}
                              />
                              <div className="fb-post__menu">
                                <button 
                                  type="button"
                                  onClick={() => handleEditPost(postId)}
                                  className="fb-post__menu-item"
                                >
                                  <span className="fb-post__menu-icon">✏️</span>
                                  <span>Chỉnh sửa bài viết</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeletePostWithMenu(postId, poster.idUser)}
                                  className="fb-post__menu-item fb-post__menu-item--danger"
                                >
                                  <span className="fb-post__menu-icon">🗑️</span>
                                  <span>Xóa bài viết</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </header>

                    <p className="fb-post__content">{poster.content}</p>

                    {poster.imageUrls && poster.imageUrls.length > 0 && (
                      <figure className="fb-post__image">
                        {poster.imageUrls.length === 1 ? (
                          <img 
                            src={poster.imageUrls[0]} 
                            alt={`Ảnh của ${getFullName()}`}
                            onClick={() => openImageViewer(poster.imageUrls!, 0)}
                            className="clickable-image"
                          />
                        ) : (
                          <div className={`fb-post__image-grid ${poster.imageUrls.length === 2 ? 'fb-post__image-grid--two' : ''}`}>
                            {poster.imageUrls.slice(0, 4).map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt={`Ảnh ${idx + 1} của ${getFullName()}`}
                                onClick={() => openImageViewer(poster.imageUrls!, idx)}
                                className="clickable-image"
                              />
                            ))}
                            {poster.imageUrls.length > 4 && (
                              <div 
                                className="fb-post__image-more clickable-image"
                                onClick={() => openImageViewer(poster.imageUrls!, 3)}
                              >
                                +{poster.imageUrls.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </figure>
                    )}

                    <footer className="fb-post__footer">
                      <div className="fb-post__stats">
                        <span className={likeCounts[postId] > 0 ? 'has-reactions' : ''}>
                          👍 {(likeCounts[postId] || 0).toLocaleString('vi-VN')}
                        </span>
                        <span 
                          onClick={() => handleToggleComments(postId)}
                          className="fb-post__stats-clickable clickable-text"
                        >
                          {(commentCounts[postId] || 0)} bình luận
                        </span>
                        <span>0 lượt chia sẻ</span>
                      </div>

                      <div className="fb-post__actions">
                        <button 
                          type="button"
                          className={`fb-post__action-btn ${userLikedPosts[postId] ? 'liked' : ''}`}
                          onClick={() => handleLikeToggle(postId)}
                          disabled={likingInProgress[postId]}
                        >
                          {userLikedPosts[postId] ? '❤️ Đã thích' : '👍 Thích'}
                        </button>
                        <button 
                          type="button" 
                          className="fb-post__action-btn"
                          onClick={() => handleToggleComments(postId)}
                        >
                          💬 Bình luận
                        </button>
                        <button type="button" className="fb-post__action-btn">↗️ Chia sẻ</button>
                        {/* <button 
                          type="button" 
                          onClick={() => navigate(`/poster/${postId}`)}
                          className="fb-post__action-btn btn-view-detail"
                        >
                          📄 Xem chi tiết
                        </button>
                        {currentUserRef.current && poster.idUser === currentUserRef.current.id && (
                          <button 
                            type="button" 
                            onClick={() => handleDeletePost(postId, poster.idUser)}
                            className="fb-post__action-btn btn-delete"
                          >
                            🗑️ Xóa
                          </button>
                        )} */}
                      </div>

                      {/* Comments Section */}
                      {showComments[postId] && (
                        <div className="fb-post__comments">
                          {/* Comment Input */}
                          <div className="fb-comment-input">
                            <img 
                              src={currentUserRef.current?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'}
                              alt="Your avatar"
                              className="fb-comment-input__avatar"
                            />
                            <div className="fb-comment-input__field">
                              <input
                                type="text"
                                placeholder="Viết bình luận..."
                                value={commentInputs[postId] || ''}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [postId]: e.target.value }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !submittingComment[postId]) {
                                    handleSubmitComment(postId);
                                  }
                                }}
                                disabled={submittingComment[postId]}
                              />
                              {commentInputs[postId]?.trim() && (
                                <button
                                  type="button"
                                  onClick={() => handleSubmitComment(postId)}
                                  disabled={submittingComment[postId]}
                                  className="fb-comment-input__submit"
                                >
                                  {submittingComment[postId] ? '...' : '➤'}
                                </button>
                              )}
                            </div>
                          </div>

                          {loadingComments[postId] ? (
                            <div className="fb-comments-loading">Đang tải bình luận...</div>
                          ) : comments[postId] && comments[postId].length > 0 ? (
                            <div className="fb-comments-list">
                              {comments[postId].map(comment => (
                                <div key={comment.idComment} className="fb-comment">
                                  <img 
                                    src={comment.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
                                    alt={`${comment.userFirstName} ${comment.userLastName}`}
                                    className="fb-comment__avatar"
                                  />
                                  <div className="fb-comment__content">
                                    {editingComment[comment.idComment] ? (
                                      <div className="fb-comment__edit">
                                        <input
                                          type="text"
                                          value={editInputs[comment.idComment] || ''}
                                          onChange={(e) => setEditInputs(prev => ({ ...prev, [comment.idComment]: e.target.value }))}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleSubmitEdit(postId, comment.idComment);
                                            } else if (e.key === 'Escape') {
                                              handleToggleEdit(comment.idComment, postId, comment.content);
                                            }
                                          }}
                                          className="fb-comment__edit-field"
                                          disabled={submittingEdit[comment.idComment]}
                                          autoFocus
                                        />
                                        <div className="fb-comment__edit-actions">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleEdit(comment.idComment, postId, comment.content)}
                                            disabled={submittingEdit[comment.idComment]}
                                          >
                                            Hủy
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSubmitEdit(postId, comment.idComment)}
                                            disabled={submittingEdit[comment.idComment] || !editInputs[comment.idComment]?.trim()}
                                            className="btn-primary"
                                          >
                                            {submittingEdit[comment.idComment] ? 'Đang lưu...' : 'Lưu'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="fb-comment__bubble">
                                          <strong>
                                            {comment.userFirstName && comment.userLastName 
                                              ? `${comment.userFirstName} ${comment.userLastName}`.trim()
                                              : comment.userName || 'Người dùng'}
                                          </strong>
                                          <p>{comment.content}</p>
                                        </div>
                                        <div className="fb-comment__meta">
                                          <span>{formatCommentTime(comment.createdAt)}</span>
                                          <button type="button">Thích</button>
                                          <button 
                                            type="button"
                                            onClick={() => handleToggleReply(comment.idComment, postId)}
                                          >
                                            Phản hồi
                                          </button>
                                          {currentUserRef.current?.id === comment.idUser && (
                                            <>
                                              <button 
                                                type="button"
                                                onClick={() => handleToggleEdit(comment.idComment, postId, comment.content)}
                                              >
                                                Sửa
                                              </button>
                                              <button 
                                                type="button"
                                                onClick={() => handleDeleteComment(postId, comment.idComment)}
                                              >
                                                Xóa
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </>
                                    )}
                                    
                                    {/* Reply Input */}
                                    {replyingTo[comment.idComment] && (
                                      <div className="fb-reply-input">
                                        <img 
                                          src={currentUserRef.current?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
                                          alt="Your avatar" 
                                          className="fb-reply-input__avatar"
                                        />
                                        <div className="fb-reply-input__field-wrapper">
                                          <input
                                            type="text"
                                            placeholder="Viết phản hồi..."
                                            value={replyInputs[comment.idComment] || ''}
                                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [comment.idComment]: e.target.value }))}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSubmitReply(postId, comment.idComment);
                                              }
                                            }}
                                            className="fb-reply-input__field"
                                            disabled={submittingReply[comment.idComment]}
                                          />
                                          {replyInputs[comment.idComment]?.trim() && (
                                            <button
                                              type="button"
                                              onClick={() => handleSubmitReply(postId, comment.idComment)}
                                              disabled={submittingReply[comment.idComment]}
                                              className="fb-reply-input__submit"
                                            >
                                              {submittingReply[comment.idComment] ? '...' : '➤'}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="fb-comment__replies">
                                        {comment.replies.map(reply => (
                                          <div key={reply.idComment} className="fb-comment fb-comment--reply">
                                            <img 
                                              src={reply.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
                                              alt={`${reply.userFirstName} ${reply.userLastName}`}
                                              className="fb-comment__avatar"
                                            />
                                            <div className="fb-comment__content">
                                              {editingComment[reply.idComment] ? (
                                                <div className="fb-comment__edit">
                                                  <input
                                                    type="text"
                                                    value={editInputs[reply.idComment] || ''}
                                                    onChange={(e) => setEditInputs(prev => ({ ...prev, [reply.idComment]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSubmitEdit(postId, reply.idComment);
                                                      } else if (e.key === 'Escape') {
                                                        handleToggleEdit(reply.idComment, postId, reply.content);
                                                      }
                                                    }}
                                                    className="fb-comment__edit-field"
                                                    disabled={submittingEdit[reply.idComment]}
                                                    autoFocus
                                                  />
                                                  <div className="fb-comment__edit-actions">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleToggleEdit(reply.idComment, postId, reply.content)}
                                                      disabled={submittingEdit[reply.idComment]}
                                                    >
                                                      Hủy
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleSubmitEdit(postId, reply.idComment)}
                                                      disabled={submittingEdit[reply.idComment] || !editInputs[reply.idComment]?.trim()}
                                                      className="btn-primary"
                                                    >
                                                      {submittingEdit[reply.idComment] ? 'Đang lưu...' : 'Lưu'}
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <>
                                                  <div className="fb-comment__bubble">
                                                    <strong>
                                                      {reply.userFirstName && reply.userLastName 
                                                        ? `${reply.userFirstName} ${reply.userLastName}`.trim()
                                                        : reply.userName || 'Người dùng'}
                                                    </strong>
                                                    <p>{reply.content}</p>
                                                  </div>
                                                  <div className="fb-comment__meta">
                                                    <span>{formatCommentTime(reply.createdAt)}</span>
                                                    <button type="button">Thích</button>
                                                    <button type="button">Phản hồi</button>
                                                    {currentUserRef.current?.id === reply.idUser && (
                                                      <>
                                                        <button 
                                                          type="button"
                                                          onClick={() => handleToggleEdit(reply.idComment, postId, reply.content)}
                                                        >
                                                          Sửa
                                                        </button>
                                                        <button 
                                                          type="button"
                                                          onClick={() => handleDeleteComment(postId, reply.idComment)}
                                                        >
                                                          Xóa
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="fb-comments-empty">Chưa có bình luận nào</div>
                          )}
                        </div>
                      )}
                    </footer>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>

    {/* Image Viewer Modal */}
    {viewerOpen && (
      <ImageViewer
        images={viewerImages}
        currentIndex={viewerIndex}
        onClose={closeImageViewer}
        onNext={nextImage}
        onPrev={prevImage}
      />
    )}
    </>
  );
};

export default ProfileDetail;
