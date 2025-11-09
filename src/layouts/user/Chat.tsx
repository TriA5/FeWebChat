import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo } from '../../api/user/loginApi';
import { connect as wsConnect, subscribe as wsSubscribe, send as wsSend } from '../../api/websocket/stompClient';
import { 
  getMessages as getMessagesApi, 
  listConversations,
  createGroup,
  listGroups,
  getGroupMessages,
  sendGroupMessage,
  joinGroup,
  getGroupMembers,
  deleteGroup,
  sendImageMessage,
  sendGroupImageMessage,
  downloadChatFile,
  getMessagesPaginated,
  getGroupMessagesPaginated,
  deleteMessage,
  getConversationImages,
  getConversationFiles,
  ChatMessageDTO,
  addMemberIfNotFriend
} from '../../api/chat/chatApi';
import { getUserById, BasicUserDTO, searchUserByPhone } from '../../api/user/userApi';
import { getFriendsList } from '../../api/user/friendshipApi';
import { initiateCall, endCall, VideoCallDTO } from '../../api/videocall/videoCallApi';
import { WebRTCService } from '../../services/webrtc/WebRTCService';
import IncomingCallModal from '../../components/videocall/IncomingCallModal';
import VideoCallInterface from '../../components/videocall/VideoCallInterface';
import { 
  initiateGroupCall, 
  joinGroupCall, 
  GroupVideoCallDTO
} from '../../api/videocall/groupVideoCallApi';
import GroupVideoCallInterface from '../../components/videocall/GroupVideoCallInterface';
import { getClient } from '../../api/websocket/stompClient';
import './Chat.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isOwn: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  participants: string[];
  type: 'private' | 'group';
  role?: 'ADMIN' | 'MEMBER';
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline: boolean;
}



const Chat: React.FC = () => {
  console.log('🚀 Chat component rendering...');
  const navigate = useNavigate();
  
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [friendMap, setFriendMap] = useState<Record<string, { name: string; avatar?: string }>>({});
  const [friendsList, setFriendsList] = useState<any[]>([]); // raw friend list for modal selection
  const [userCache, setUserCache] = useState<Record<string, { name: string; avatar?: string }>>({});

  // Group states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupSuccess, setGroupSuccess] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'create' | 'add-members' | 'add-by-phone'>('create');
  const [addingMembers, setAddingMembers] = useState(false);
  const [addMembersError, setAddMembersError] = useState<string | null>(null);
  const [addMembersSuccess, setAddMembersSuccess] = useState<string | null>(null);
  
  // Add member by phone states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<BasicUserDTO | null>(null);
  const [addingByPhone, setAddingByPhone] = useState(false);
  const [addByPhoneError, setAddByPhoneError] = useState<string | null>(null);
  const [addByPhoneSuccess, setAddByPhoneSuccess] = useState<string | null>(null);
  
  // Delete group states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  
  // Video call states (1-1)
  const [incomingCall, setIncomingCall] = useState<VideoCallDTO | null>(null);
  const [activeCall, setActiveCall] = useState<VideoCallDTO | null>(null);
  const [isVideoCallVisible, setIsVideoCallVisible] = useState(false);
  const [isVideoCallMinimized, setIsVideoCallMinimized] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState('00:00');
  const [webRTCService, setWebRTCService] = useState<WebRTCService | null>(null);
  
  // Group video call states
  const [activeGroupCall, setActiveGroupCall] = useState<GroupVideoCallDTO | null>(null);
  const [isGroupCallVisible, setIsGroupCallVisible] = useState(false);
  const [showGroupCallNotification, setShowGroupCallNotification] = useState(false);
  const [groupCallNotificationData, setGroupCallNotificationData] = useState<GroupVideoCallDTO | null>(null);
  
  // Fake camera mode for testing on single device
  const [useFakeCamera, setUseFakeCamera] = useState(() => {
    return localStorage.getItem('useFakeCamera') === 'true';
  });
  
  // Track downloading files to prevent duplicate downloads
  const [downloadingFiles, setDownloadingFiles] = useState<Record<string, boolean>>({});
  
  // Pagination states
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // Track current page number
  
  // New features states
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [conversationImages, setConversationImages] = useState<ChatMessageDTO[]>([]);
  const [conversationFiles, setConversationFiles] = useState<ChatMessageDTO[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // For images
  const docFileInputRef = useRef<HTMLInputElement>(null); // For documents
  const videoFileInputRef = useRef<HTMLInputElement>(null); // For videos
  const callStartTimeRef = useRef<Date | null>(null);
  const hasScrolledToBottomRef = useRef(false); // Track if user has scrolled to bottom initially

  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
      hasScrolledToBottomRef.current = true; // Mark as scrolled to bottom
    }
  };

  // Chỉ auto scroll khi có tin nhắn MỚI, không scroll khi load more tin nhắn cũ
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    // Nếu tin nhắn được thêm vào CUỐI (tin nhắn mới), scroll xuống
    // Nếu tin nhắn được thêm vào ĐẦU (load more), KHÔNG scroll
    if (messages.length > 0) {
      const isNewMessage = messages.length > prevMessagesLengthRef.current && 
                           messages.length - prevMessagesLengthRef.current <= 5; // Chỉ scroll khi thêm <= 5 tin nhắn (tin nhắn mới realtime)
      
      if (isNewMessage) {
        scrollToBottom();
      }
      
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages]);

  // Auto scroll when selecting a new chat room
  useEffect(() => {
    if (selectedChatRoom) {
      // Reset pagination state khi chuyển room
      setHasMoreMessages(true);
      setCurrentPage(0); // Reset về trang 0
      hasScrolledToBottomRef.current = false; // Reset scroll flag
      
      // Scroll xuống ngay lập tức không cần delay
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [selectedChatRoom]);

  // Video call cleanup (called by WebRTC when connection ends)
  const cleanupCall = useCallback(() => {
    setActiveCall(null);
    setIsVideoCallVisible(false);
    setIsVideoCallMinimized(false);
    setLocalStream(null);
    setRemoteStream(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  setIsRemoteVideoEnabled(true);
    setCallDuration('00:00');
    callStartTimeRef.current = null;
  }, []);

  // Video call end handler (called by user clicking end call button)
  const handleEndCall = useCallback(async () => {
    if (activeCall) {
      try {
        // Call REST API to end call on backend
        await endCall(activeCall.id);
        
        // Send WebSocket message for real-time notification
        wsSend('/app/video-call/end', { callId: activeCall.id });
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
    
    // End WebRTC call (this will trigger onCallEnded -> cleanupCall)
    if (webRTCService) {
      webRTCService.endCall();
    }
  }, [activeCall, webRTCService]);

  // (Removed: loadChatRooms; init effect below will fetch conversations)

  const loadMessages = useCallback(async (room: ChatRoom) => {
    try {
      const me = getUserInfo();
      const myId = me?.id;
      const myName = me?.username || 'Tôi';
      
      // Sử dụng pagination API - lấy 20 tin nhắn mới nhất
      const msgs = room.type === 'group' 
        ? await getGroupMessagesPaginated(room.id, 0, 20)
        : await getMessagesPaginated(room.id, 0, 20);
      
      // Reset hasMore - nếu nhận được đủ 20 tin nhắn, có thể còn tin nhắn cũ hơn
      setHasMoreMessages(msgs.length === 20);
      
      // Collect unknown sender IDs to fetch
      const unknownIds = Array.from(new Set(
        msgs
          .map(m => m.senderId)
          .filter(id => id && id !== myId && !friendMap[id] && !userCache[id])
      ));
      // Fetch unknown users
      const additions: Record<string, { name: string; avatar?: string }> = {};
      if (unknownIds.length) {
        console.log('🔍 Fetching user info for IDs:', unknownIds);
        const results = await Promise.allSettled(unknownIds.map(id => getUserById(id)));
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value) {
            const u = r.value;
            const userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Người dùng';
            console.log(`✅ Loaded user ${unknownIds[idx]}:`, { name: userName, avatar: u.avatar });
            additions[unknownIds[idx]] = { name: userName, avatar: u.avatar };
          } else {
            console.error(`❌ Failed to load user ${unknownIds[idx]}:`, r);
          }
        });
        if (Object.keys(additions).length) {
          console.log('💾 Updating userCache with additions:', additions);
          setUserCache(prev => ({ ...prev, ...additions }));
        }
      }
      
      // Build combined cache with new additions
      const combinedCache = { ...userCache, ...friendMap, ...additions };
      console.log('📦 Combined cache for messages:', combinedCache);
      console.log('📨 Total messages to transform:', msgs.length);
      
      const transformed: Message[] = msgs.map(m => {
        const extra = combinedCache[m.senderId];
        if (!extra && m.senderId !== myId) {
          console.warn(`⚠️ No user info for senderId ${m.senderId}`);
        }
        return {
          id: m.id,
          senderId: m.senderId,
            senderName: m.senderId === myId ? myName : (extra?.name || 'Người dùng'),
            senderAvatar: extra?.avatar,
          content: m.content.startsWith('"') && m.content.endsWith('"') && m.content.length > 1 ? m.content.slice(1, -1) : m.content,
          timestamp: new Date(m.createdAt),
          type: (m.messageType?.toLowerCase() as 'text' | 'image' | 'file') || 'text',
          imageUrl: m.imageUrl,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          isOwn: m.senderId === myId
        };
      });
      setMessages(transformed);
    } catch (e) {
      console.error('Load messages failed', e);
      setMessages([]);
      setHasMoreMessages(false);
    }
  }, [friendMap, userCache]);

  // Load thêm tin nhắn cũ hơn khi scroll lên - Dùng page number
  const loadMoreMessages = useCallback(async () => {
    if (loadingMoreMessages || !hasMoreMessages || !selectedChatRoom) {
      return;
    }

    // Lưu scroll position và scroll height trước khi load
    const messagesArea = messagesAreaRef.current;
    const scrollHeightBefore = messagesArea?.scrollHeight || 0;
    const scrollTopBefore = messagesArea?.scrollTop || 0;

    setLoadingMoreMessages(true);
    try {
      const me = getUserInfo();
      const myId = me?.id;
      const myName = me?.username || 'Tôi';
      
      // Tăng page number lên 1
      const nextPage = currentPage + 1;
      
      console.log(`📜 Loading page ${nextPage} (size: 20)`);
      
      // Lấy trang tiếp theo
      const olderMsgs = selectedChatRoom.type === 'group'
        ? await getGroupMessagesPaginated(selectedChatRoom.id, nextPage, 20)
        : await getMessagesPaginated(selectedChatRoom.id, nextPage, 20);
      
      // Nếu nhận được ít hơn 20 tin nhắn, không còn tin nhắn nữa
      if (olderMsgs.length < 20) {
        setHasMoreMessages(false);
      }
      
      if (olderMsgs.length === 0) {
        console.log('✅ Không còn tin nhắn cũ hơn');
        setHasMoreMessages(false);
        return;
      }
      
      // Cập nhật page number
      setCurrentPage(nextPage);
      console.log(`✅ Page updated: ${currentPage} → ${nextPage}`);
      
      // Collect unknown sender IDs
      const unknownIds = Array.from(new Set(
        olderMsgs
          .map(m => m.senderId)
          .filter(id => id && id !== myId && !friendMap[id] && !userCache[id])
      ));
      
      const additions: Record<string, { name: string; avatar?: string }> = {};
      if (unknownIds.length) {
        const results = await Promise.allSettled(unknownIds.map(id => getUserById(id)));
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value) {
            const u = r.value;
            const userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Người dùng';
            additions[unknownIds[idx]] = { name: userName, avatar: u.avatar };
          }
        });
        if (Object.keys(additions).length) {
          setUserCache(prev => ({ ...prev, ...additions }));
        }
      }
      
      const combinedCache = { ...userCache, ...friendMap, ...additions };
      
      const transformed: Message[] = olderMsgs.map(m => {
        const extra = combinedCache[m.senderId];
        return {
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderId === myId ? myName : (extra?.name || 'Người dùng'),
          senderAvatar: extra?.avatar,
          content: m.content.startsWith('"') && m.content.endsWith('"') && m.content.length > 1 ? m.content.slice(1, -1) : m.content,
          timestamp: new Date(m.createdAt),
          type: (m.messageType?.toLowerCase() as 'text' | 'image' | 'file') || 'text',
          imageUrl: m.imageUrl,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          isOwn: m.senderId === myId
        };
      });
      
      // Thêm tin nhắn cũ vào đầu danh sách
      setMessages(prev => [...transformed, ...prev]);
      
      // Restore scroll position sau khi thêm tin nhắn cũ
      requestAnimationFrame(() => {
        if (messagesArea) {
          const scrollHeightAfter = messagesArea.scrollHeight;
          const scrollHeightDiff = scrollHeightAfter - scrollHeightBefore;
          messagesArea.scrollTop = scrollTopBefore + scrollHeightDiff;
          console.log(`📍 Restored scroll position: ${scrollTopBefore} + ${scrollHeightDiff} = ${messagesArea.scrollTop}`);
        }
      });
      
      console.log(`✅ Loaded ${transformed.length} messages from page ${nextPage}`);
      
    } catch (e) {
      console.error('❌ Load more messages failed', e);
      setHasMoreMessages(false);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [loadingMoreMessages, hasMoreMessages, selectedChatRoom, currentPage, friendMap, userCache]);

  // Initialize WebRTC service when currentUser is available
  useEffect(() => {
    if (currentUser && !webRTCService) {
      const service = new WebRTCService(currentUser.id);
      // Attach global error handler for media issues
      service.onError = (err) => {
        console.error('🚨 WebRTC error surfaced to Chat:', err);
        alert(err.message + '\nHướng dẫn nhanh:\n1. Kiểm tra ứng dụng khác đang dùng camera\n2. Mở lại quyền camera/micro trong trình duyệt\n3. Nếu vẫn lỗi thử F5 hoặc đổi sang audio-only.');
      };
      setWebRTCService(service as any);

      // Enumerate devices for debug (non-blocking)
      navigator.mediaDevices?.enumerateDevices?.().then(list => {
        console.log('🎚️ Thiết bị khả dụng:', list.map(d => ({ kind: d.kind, label: d.label, id: d.deviceId?.slice(0,8)+'...' })));
      }).catch(() => {});
    }
  }, [currentUser, webRTCService]);

  // Initialize current user and load friends + conversations
  useEffect(() => {
    const init = async () => {
      const user = getUserInfo();
      if (user) {
        const currentUserData = {
          id: user.id || '1',
          username: user.username || 'user',
          firstName: user.lastName || 'User',
          lastName: user.lastName || '',
          avatar: user.avatar || '',
          isOnline: true,
        };
        console.log('👤 Setting current user:', currentUserData);
        setCurrentUser(currentUserData);
      }
      try {
        const me = getUserInfo();
        if (!me?.id) return;
        // Load friends and build lookup
        const friends = await getFriendsList();
        setFriendsList(friends);
        const map: Record<string, { name: string; avatar?: string }> = {};
        friends.forEach(f => {
          if (f.userId) {
            map[f.userId] = { name: `${f.firstName} ${f.lastName}`.trim(), avatar: f.avatar };
          }
        });
        setFriendMap(map);
        const convs = await listConversations(me.id);
        const roomsPrivate: ChatRoom[] = convs.map(c => {
          const otherId = c.participant1Id === me.id ? c.participant2Id : c.participant1Id;
          const info = map[otherId];
          return {
            id: c.id,
            name: info?.name || 'Cuộc trò chuyện',
            avatar: info?.avatar || '',
            lastMessage: '',
            lastMessageTime: undefined,
            unreadCount: 0,
            isOnline: true,
            participants: [c.participant1Id, c.participant2Id],
            type: 'private'
          };
        });
        // Load groups with members info
        let groupRooms: ChatRoom[] = [];
        try {
          const groups = await listGroups(me.id);
          // Load members for each group to get names
          const groupsWithMembers = await Promise.all(
            groups.map(async (g) => {
              try {
                const members = await getGroupMembers(g.id);
                const memberUserIds = members.map((m: any) => m.userId).filter((id: string) => id !== me.id);
                
                // Load member names if not in cache
                const memberNames: string[] = [];
                for (const memberId of memberUserIds.slice(0, 3)) { // Only first 3 members
                  const cached = map[memberId] || userCache[memberId];
                  if (cached) {
                    memberNames.push(cached.name);
                  } else {
                    try {
                      const memberInfo = await getUserById(memberId);
                      if (memberInfo) {
                        const name = `${memberInfo.firstName || ''} ${memberInfo.lastName || ''}`.trim() || memberInfo.username || 'Thành viên';
                        memberNames.push(name);
                        setUserCache(prev => ({ ...prev, [memberId]: { name, avatar: memberInfo.avatar } }));
                      }
                    } catch {}
                  }
                }
                
                const subtitle = memberNames.length > 0 ? memberNames.join(', ') + (memberUserIds.length > 3 ? '...' : '') : `${members.length} thành viên`;
                
                return {
                  id: g.id,
                  name: g.name,
                  avatar: '',
                  lastMessage: subtitle, // Show members in subtitle
                  lastMessageTime: undefined,
                  unreadCount: 0,
                  isOnline: true,
                  participants: members.map((m: any) => m.userId),
                  type: 'group' as const,
                  role: g.createdBy === me.id ? 'ADMIN' as const : 'MEMBER' as const
                };
              } catch {
                return {
                  id: g.id,
                  name: g.name,
                  avatar: '',
                  lastMessage: '',
                  lastMessageTime: undefined,
                  unreadCount: 0,
                  isOnline: true,
                  participants: [g.createdBy, me.id].filter((x): x is string => !!x),
                  type: 'group' as const,
                  role: g.createdBy === me.id ? 'ADMIN' as const : 'MEMBER' as const
                };
              }
            })
          );
          groupRooms = groupsWithMembers;
        } catch (ge) {
          console.warn('List groups failed', ge);
        }
        setChatRooms([...groupRooms, ...roomsPrivate]);
      } catch (e) {
        console.error('Init chat failed', e);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When rooms are loaded and none selected, pick first and load messages
  useEffect(() => {
    const selectFirst = async () => {
      if (!selectedChatRoom && chatRooms.length > 0) {
        const first = chatRooms[0];
        setSelectedChatRoom(first);
        await loadMessages(first);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    selectFirst();
  }, [chatRooms, selectedChatRoom, loadMessages]);

  const handleSelectChatRoom = async (room: ChatRoom) => {
    try {
      setSelectedChatRoom(room);
      await loadMessages(room);
      // Auto scroll to bottom after loading messages
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    } catch (e) {
      console.error('Select chat room failed', e);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedChatRoom || !currentUser || selectedChatRoom.type !== 'group') return;
    
    try {
      setDeletingGroup(true);
      await deleteGroup(selectedChatRoom.id, currentUser.id);
      
      // Remove group from chat rooms list
      setChatRooms(prev => prev.filter(room => room.id !== selectedChatRoom.id));
      
      // Clear selection
      setSelectedChatRoom(null);
      setMessages([]);
      
      // Close confirmation modal
      setShowDeleteConfirm(false);
      
      alert('Nhóm đã được xóa thành công!');
    } catch (error: any) {
      console.error('Delete group failed:', error);
      alert(error.message || 'Không thể xóa nhóm');
    } finally {
      setDeletingGroup(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatRoom || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh!');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 5MB!');
      return;
    }

    try {
      if (selectedChatRoom.type === 'group') {
        await sendGroupImageMessage(selectedChatRoom.id, currentUser.id, file);
      } else {
        await sendImageMessage(selectedChatRoom.id, currentUser.id, file);
      }
      // Message will be received via WebSocket
    } catch (error: any) {
      console.error('Send image failed:', error);
      alert(error.message || 'Không thể gửi ảnh');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatRoom || !currentUser) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 10MB!');
      return;
    }

    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Loại file không được hỗ trợ! Chỉ chấp nhận PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR');
      return;
    }

    try {
      const { sendFileMessage, sendGroupFileMessage } = await import('../../api/chat/chatApi');
      if (selectedChatRoom.type === 'group') {
        await sendGroupFileMessage(selectedChatRoom.id, currentUser.id, file);
      } else {
        await sendFileMessage(selectedChatRoom.id, currentUser.id, file);
      }
      // Message will be received via WebSocket
    } catch (error: any) {
      console.error('Send file failed:', error);
      alert(error.message || 'Không thể gửi file');
    }

    // Reset file input
    if (docFileInputRef.current) {
      docFileInputRef.current.value = '';
    }
  };

  // Video upload handler
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatRoom || !currentUser) return;

    console.log('📹 Video selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    });

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Vui lòng chọn file video!');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert(`Kích thước video không được vượt quá 50MB!\nKích thước hiện tại: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }

    // Check for empty file
    if (file.size === 0) {
      alert('File video trống! Vui lòng chọn file khác.');
      return;
    }

    try {
      console.log('📤 Uploading video...');
      const { sendFileMessage, sendGroupFileMessage } = await import('../../api/chat/chatApi');
      if (selectedChatRoom.type === 'group') {
        await sendGroupFileMessage(selectedChatRoom.id, currentUser.id, file);
      } else {
        await sendFileMessage(selectedChatRoom.id, currentUser.id, file);
      }
      console.log('✅ Video uploaded successfully');
      // Message will be received via WebSocket
    } catch (error: any) {
      console.error('❌ Send video failed:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Không thể gửi video';
      alert(`Lỗi tải video:\n${errorMsg}\n\nGợi ý:\n- Kiểm tra kích thước file (tối đa 50MB)\n- Kiểm tra định dạng video (MP4, WebM, ...)\n- Thử file video khác`);
    }

    // Reset file input
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  // Helper: check if a file name or url is a video
  const isVideoFile = (fileName?: string, fileUrl?: string) => {
    const str = (fileName || fileUrl || '').toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.mkv', '.m4v'].some(ext => str.endsWith(ext));
  };

  // Handle file download with loading state
  const handleDownloadFile = async (fileUrl: string, fileName?: string) => {
    const fileKey = fileUrl;
    
    // Prevent duplicate downloads
    if (downloadingFiles[fileKey]) {
      console.log('⏳ File đang được tải...');
      return;
    }
    
    try {
      console.log('📥 Bắt đầu tải file:', fileUrl, fileName);
      setDownloadingFiles(prev => ({ ...prev, [fileKey]: true }));
      await downloadChatFile(fileUrl, fileName);
      console.log('✅ Tải file thành công');
    } catch (error: any) {
      console.error('❌ Tải file thất bại:', error);
      alert(error.message || 'Không thể tải file. Vui lòng thử lại.');
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [fileKey]: false }));
    }
  };

  // Handler for deleting message
  const handleDeleteMessage = async () => {
    if (!contextMenuMessage || !currentUser) return;
    
    if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
      setContextMenuMessage(null);
      return;
    }
    
    setDeletingMessage(true);
    try {
      await deleteMessage(contextMenuMessage.id, currentUser.id);
      // Remove message from local state
      setMessages(prev => prev.filter(m => m.id !== contextMenuMessage.id));
      setContextMenuMessage(null);
    } catch (error: any) {
      console.error('❌ Xóa tin nhắn thất bại:', error);
      alert(error.message || 'Không thể xóa tin nhắn. Vui lòng thử lại.');
    } finally {
      setDeletingMessage(false);
    }
  };

  // Handler for viewing all images in conversation
  const handleViewImages = async () => {
    if (!selectedChatRoom) return;
    
    setLoadingImages(true);
    setShowImagesModal(true);
    try {
      const images = await getConversationImages(selectedChatRoom.id);
      
      // Fetch user info for all senders (API returns 'sender' not 'senderId')
      const uniqueSenderIds = Array.from(new Set(images.map(img => img.sender)));
      const userPromises = uniqueSenderIds.map(id => getUserById(id));
      const users = await Promise.all(userPromises);
      
      // Update userCache with fetched users
      const newCache: Record<string, { name: string; avatar?: string }> = {};
      users.forEach(user => {
        if (user) {
          newCache[user.idUser] = {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            avatar: user.avatar
          };
        }
      });
      setUserCache(prev => ({ ...prev, ...newCache }));
      
      setConversationImages(images);
    } catch (error: any) {
      console.error('❌ Tải danh sách ảnh thất bại:', error);
      alert(error.message || 'Không thể tải danh sách ảnh. Vui lòng thử lại.');
      setShowImagesModal(false);
    } finally {
      setLoadingImages(false);
    }
  };

  // Handler for viewing all files in conversation
  const handleViewFiles = async () => {
    if (!selectedChatRoom) return;
    
    setLoadingFiles(true);
    setShowFilesModal(true);
    try {
      const files = await getConversationFiles(selectedChatRoom.id);
      
      // Fetch user info for all senders (API returns 'sender' not 'senderId')
      const uniqueSenderIds = Array.from(new Set(files.map(f => f.sender)));
      const userPromises = uniqueSenderIds.map(id => getUserById(id));
      const users = await Promise.all(userPromises);
      
      // Update userCache with fetched users
      const newCache: Record<string, { name: string; avatar?: string }> = {};
      users.forEach(user => {
        if (user) {
          newCache[user.idUser] = {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            avatar: user.avatar
          };
        }
      });
      setUserCache(prev => ({ ...prev, ...newCache }));
      
      setConversationFiles(files);
    } catch (error: any) {
      console.error('❌ Tải danh sách file thất bại:', error);
      alert(error.message || 'Không thể tải danh sách file. Vui lòng thử lại.');
      setShowFilesModal(false);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Helper function to get sender name from DTO
  const getSenderName = (senderId: string): string => {
    if (senderId === currentUser?.id) {
      return 'Bạn';
    }
    // Try to get from userCache or friendMap
    const cached = userCache[senderId] || friendMap[senderId];
    return cached ? cached.name : 'Unknown User';
  };

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on the menu button or menu itself
      if (!target.closest('.message-actions')) {
        setContextMenuMessage(null);
      }
    };
    
    if (contextMenuMessage) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatRoom || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage('');

    // send via websocket
    if (selectedChatRoom.type === 'group') {
      // Use REST API for group messages - WebSocket will handle the update
      sendGroupMessage(selectedChatRoom.id, currentUser.id, content)
        .catch(err => console.error('Send group message failed', err));
      // Don't add optimistic update - let WebSocket handle it to avoid duplicates
    } else {
      wsSend('/app/chat.send', {
        conversationId: selectedChatRoom.id,
        senderId: currentUser.id,
        content,
      });
    }

    // Auto scroll to bottom after sending message
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    // Focus input
    inputRef.current?.focus();
  };

  // GROUP VIDEO CALL NOTIFICATION HANDLER
  // ==================================================
  const handleGroupCallNotification = useCallback((signal: any) => {
    console.log('📹 ============================================');
    console.log('📹 Processing group call signal:', signal);
    console.log('📹 Signal type:', signal.type);
    console.log('📹 Signal data:', signal.data);
    console.log('📹 Current user ID:', currentUser?.id);
    
    if (signal.type === 'CALL_INITIATED' && signal.data) {
      const callData: GroupVideoCallDTO = signal.data;
      console.log('📹 Call initiated by:', callData.initiatorId);
      console.log('📹 Call ID:', callData.id);
      console.log('📹 Group ID:', callData.groupId);
      console.log('📹 Group Name:', callData.groupName);
      console.log('📹 Participants:', callData.participants);
      
      // Only show notification if user is not the initiator
      if (callData.initiatorId !== currentUser?.id) {
        console.log('✅ Showing notification to user');
        setGroupCallNotificationData(callData);
        setShowGroupCallNotification(true);
      } else {
        console.log('⏭️ Skipping notification - user is initiator');
      }
    } else if (signal.type === 'CALL_ENDED') {
      console.log('🛑 Call ended notification');
      setShowGroupCallNotification(false);
      setGroupCallNotificationData(null);
      // Cleanup if in active call
      if (activeGroupCall) {
        setActiveGroupCall(null);
        setIsGroupCallVisible(false);
      }
    } else {
      console.log('⚠️ Unknown signal type or missing data');
    }
    console.log('📹 ============================================');
  }, [currentUser?.id, activeGroupCall]);

  // websocket subscriptions
  useEffect(() => {
    const me = getUserInfo();
    console.log('🌐 WebSocket useEffect - user info:', me);
  let subConv: any = null;
  let subMsg: any = null;
  let subGroupList: any = null;
  let subGroupMsg: any = null;
    let subVideoCall: any = null;
    let subVideoSignal: any = null;
    let subGroupMemberRemoved: any = null;
    
    if (!me?.id || !currentUser?.id) {
      console.log('⚠️ No user info available, skipping WebSocket setup');
      return;
    }

    wsConnect(() => {
      if (me?.id) {
        subConv = wsSubscribe(`/topic/conversations/${me.id}`, (msg) => {
          const data = JSON.parse(msg.body);
          const myId = me.id;
          const otherId = data.participant1Id === myId ? data.participant2Id : data.participant1Id;
          const info = friendMap[otherId];
          setChatRooms(prev => [{
            id: data.id,
            name: info?.name || 'Cuộc trò chuyện',
            unreadCount: 0,
            isOnline: true,
            participants: [myId, otherId],
            avatar: info?.avatar || '',
            lastMessage: '',
            lastMessageTime: new Date()
          } as any, ...prev]);
        });

        // Subscribe to video call events
        console.log('🔔 Subscribing to video call events for user:', me.id);
        subVideoCall = wsSubscribe(`/topic/video-call/${me.id}`, (msg) => {
          const call: VideoCallDTO = JSON.parse(msg.body);
          console.log('📞 Received video call event:', call);
          
          if (call.status === 'INITIATED' && call.calleeId === me.id) {
            console.log('📲 Setting incoming call for user:', me.id);
            setIncomingCall(call);
          } else if (call.status === 'ACCEPTED') {
            if (activeCall && call.id === activeCall.id) {
              setActiveCall(call);
            }
          } else if (call.status === 'REJECTED' || call.status === 'ENDED' || call.status === 'TIMEOUT') {
            if (activeCall && call.id === activeCall.id) {
              cleanupCall();
            }
            if (incomingCall && call.id === incomingCall.id) {
              setIncomingCall(null);
            }
          }
        });

        // Subscribe to video call signaling
        subVideoSignal = wsSubscribe(`/topic/video-signal/${me.id}`, (msg) => {
          const signal = JSON.parse(msg.body);
          if (webRTCService) {
            webRTCService.handleSignal(signal);
          }
        });
      }
      
      if (selectedChatRoom) {
        if (selectedChatRoom.type === 'private') {
          subMsg = wsSubscribe(`/topic/chat/${selectedChatRoom.id}`, (msg) => {
            const data = JSON.parse(msg.body);
            const myId = me?.id;
            const myName = me?.username || 'Tôi';
            const parsedDate = new Date(data.createdAt);
            const ts = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
            let cacheEntry = friendMap[data.senderId] || userCache[data.senderId];
            if (!cacheEntry && data.senderId !== myId) {
              getUserById(data.senderId).then(u => {
                if (u) setUserCache(prev => ({ ...prev, [data.senderId]: { name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Người dùng', avatar: u.avatar } }));
              }).catch(()=>{});
            }
            const incoming: Message = {
              id: data.id,
              senderId: data.senderId,
              senderName: data.senderId === myId ? myName : (cacheEntry?.name || 'Người dùng'),
              senderAvatar: cacheEntry?.avatar,
              content: data.content.startsWith('"') && data.content.endsWith('"') && data.content.length > 1 ? data.content.slice(1,-1) : data.content,
              timestamp: ts,
              type: (data.messageType?.toLowerCase() as 'text' | 'image' | 'file') || 'text',
              imageUrl: data.imageUrl,
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileSize: data.fileSize,
              isOwn: data.senderId === myId,
            };
            setMessages(prev => [...prev, incoming]);
            const lastMsgText = incoming.type === 'image'
              ? '📷 Hình ảnh'
              : incoming.type === 'file' && isVideoFile(incoming.fileName, incoming.fileUrl)
                ? '🎬 Video'
                : incoming.type === 'file'
                  ? '📎 File đính kèm'
                  : incoming.content;
            setChatRooms(prev => prev.map(r => r.id === selectedChatRoom.id ? { ...r, lastMessage: lastMsgText, lastMessageTime: incoming.timestamp } : r));
          });
        } else {
          // group message topic (assuming backend provides)
            subGroupMsg = wsSubscribe(`/topic/group/${selectedChatRoom.id}`, (msg) => {
              const data = JSON.parse(msg.body);
              const myId = me?.id;
              const myName = me?.username || 'Tôi';
              const parsedDate = new Date(data.createdAt);
              const ts = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
              let cacheEntry = friendMap[data.senderId] || userCache[data.senderId];
              if (!cacheEntry && data.senderId !== myId) {
                getUserById(data.senderId).then(u => {
                  if (u) setUserCache(prev => ({ ...prev, [data.senderId]: { name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Người dùng', avatar: u.avatar } }));
                }).catch(()=>{});
              }
              const incoming: Message = {
                id: data.id,
                senderId: data.senderId,
                senderName: data.senderId === myId ? myName : (cacheEntry?.name || 'Người dùng'),
                senderAvatar: cacheEntry?.avatar,
                content: data.content.startsWith('"') && data.content.endsWith('"') && data.content.length > 1 ? data.content.slice(1,-1) : data.content,
                timestamp: ts,
                type: (data.messageType?.toLowerCase() as 'text' | 'image' | 'file') || 'text',
                imageUrl: data.imageUrl,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                isOwn: data.senderId === myId,
              };
              setMessages(prev => [...prev, incoming]);
              const lastMsgText = incoming.type === 'image'
                ? '📷 Hình ảnh'
                : incoming.type === 'file' && isVideoFile(incoming.fileName, incoming.fileUrl)
                  ? '🎬 Video'
                  : incoming.type === 'file'
                    ? '📎 File đính kèm'
                    : incoming.content;
              setChatRooms(prev => prev.map(r => r.id === selectedChatRoom.id ? { ...r, lastMessage: lastMsgText, lastMessageTime: incoming.timestamp, participants: r.participants.includes(incoming.senderId) ? r.participants : [...r.participants, incoming.senderId] } : r));
              setSelectedChatRoom(prev => prev && prev.id === selectedChatRoom.id ? { ...prev, participants: prev.participants.includes(incoming.senderId) ? prev.participants : [...prev.participants, incoming.senderId] } : prev);
            });
        }
      }

      // subscribe to new group events (assuming backend provides)
      if (me?.id) {
        try {
          subGroupList = wsSubscribe(`/topic/groups/${me.id}`, (msg) => {
            try {
              const data = JSON.parse(msg.body);
              
              // Check if this is a group deleted notification
              if (data.message && data.message.includes('xóa')) {
                console.log('Group deleted notification:', data);
                // Remove group from chat rooms
                setChatRooms(prev => prev.filter(room => room.id !== data.groupId));
                
                // If currently viewing this group, clear selection
                setSelectedChatRoom(prev => {
                  if (prev?.id === data.groupId) {
                    alert(`Nhóm "${data.groupName}" đã bị xóa`);
                    return null;
                  }
                  return prev;
                });
                return;
              }
              
              // Otherwise, it's a new group notification
              const g = data;
              setChatRooms(prev => {
                if (prev.some(r => r.id === g.id)) return prev; // already exists
                const newRoom: ChatRoom = {
                  id: g.id,
                  name: g.name,
                  avatar: '',
                  lastMessage: '',
                  lastMessageTime: new Date(),
                  unreadCount: 0,
                  isOnline: true,
                  participants: [g.createdBy, me.id],
                  type: 'group',
                  role: g.createdBy === me.id ? 'ADMIN' : 'MEMBER'
                };
                return [newRoom, ...prev];
              });
            } catch (er) {
              console.warn('Parse group event failed', er);
            }
          });
        } catch (subErr) {
          console.warn('Subscribe groups failed', subErr);
        }
      }

      // Subscribe to member-removed events for selected group
      if (selectedChatRoom && selectedChatRoom.type === 'group') {
        try {
          subGroupMemberRemoved = wsSubscribe(`/topic/group/${selectedChatRoom.id}/member-removed`, (msg) => {
            try {
              const notification = JSON.parse(msg.body);
              console.log('Member removed notification:', notification);
              // If removed member is current user, clear selection
              if (me?.id && notification.userId === me.id) {
                setSelectedChatRoom(null);
                // Show system message
                alert(notification.message || 'Bạn đã bị xóa khỏi nhóm');
              }
            } catch (er) {
              console.warn('Parse member-removed event failed', er);
            }
          });
        } catch (subErr) {
          console.warn('Subscribe member-removed failed', subErr);
        }
      }
    });
    return () => {
      try { subConv && subConv.unsubscribe && subConv.unsubscribe(); } catch {}
      try { subMsg && subMsg.unsubscribe && subMsg.unsubscribe(); } catch {}
      try { subGroupList && subGroupList.unsubscribe && subGroupList.unsubscribe(); } catch {}
      try { subGroupMsg && subGroupMsg.unsubscribe && subGroupMsg.unsubscribe(); } catch {}
      try { subVideoCall && subVideoCall.unsubscribe && subVideoCall.unsubscribe(); } catch {}
      try { subVideoSignal && subVideoSignal.unsubscribe && subVideoSignal.unsubscribe(); } catch {}
      try { subGroupMemberRemoved && subGroupMemberRemoved.unsubscribe && subGroupMemberRemoved.unsubscribe(); } catch {}
    };
  }, [selectedChatRoom, friendMap, activeCall, incomingCall, webRTCService, cleanupCall, currentUser, userCache, handleGroupCallNotification]);

  // Separate effect for group video call subscriptions
  useEffect(() => {
    const me = getUserInfo();
    if (!me?.id) return;
    if (chatRooms.length === 0) return;

    console.log('🎯 Setting up group video call subscriptions for', chatRooms.length, 'rooms');

    const subscriptions: any[] = [];
    let setupTimer: NodeJS.Timeout;

    // Delay subscription to ensure WebSocket is ready
    setupTimer = setTimeout(() => {
      // Subscribe to ALL groups video call notifications
      chatRooms.forEach(room => {
        if (room.type === 'group') {
          try {
            console.log('📹 Subscribing to group video call for group:', room.id, room.name);
            const sub = wsSubscribe(`/topic/group-video-call/${room.id}`, (msg) => {
              console.log('📹 RAW MESSAGE RECEIVED for group:', room.id, msg.body);
              try {
                const signal: any = JSON.parse(msg.body);
                console.log('📹 PARSED group call signal:', signal);
                handleGroupCallNotification(signal);
              } catch (parseError) {
                console.error('❌ Failed to parse group call signal:', parseError);
              }
            });
            if (sub) {
              subscriptions.push(sub);
              console.log('✅ Successfully subscribed to group:', room.name);
            } else {
              console.warn('⚠️ Subscription returned null for group:', room.name);
            }
          } catch (err) {
            console.error('❌ Failed to subscribe to group video call:', room.id, err);
          }
        }
      });
    }, 1000); // Wait 1 second for WebSocket to be ready

    // Cleanup subscriptions when chatRooms change
    return () => {
      clearTimeout(setupTimer);
      console.log('🧹 Cleaning up', subscriptions.length, 'group video call subscriptions');
      subscriptions.forEach(sub => {
        try {
          sub && sub.unsubscribe && sub.unsubscribe();
        } catch (e) {
          console.warn('Failed to unsubscribe:', e);
        }
      });
    };
  }, [chatRooms, handleGroupCallNotification]);

  // Create group handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!groupName.trim()) {
      setGroupError('Tên nhóm không được để trống');
      return;
    }
    setCreatingGroup(true);
    setGroupError(null);
    setGroupSuccess(null);
    try {
      const group = await createGroup(currentUser.id, groupName.trim(), selectedMemberIds);
      // Không thêm trực tiếp vào state ở đây để tránh duplicate
      // WebSocket subscription sẽ tự động thêm nhóm mới vào danh sách
      setGroupSuccess('Tạo nhóm thành công');
      // reset form
      setGroupName('');
      setSelectedMemberIds([]);
      // Close modal after short delay
      setTimeout(() => {
        setShowGroupModal(false);
        // Select the newly created group after WebSocket adds it
        setTimeout(() => {
          setChatRooms(prev => {
            const newGroup = prev.find(r => r.id === group.id);
            if (newGroup) {
              setSelectedChatRoom(newGroup);
              setMessages([]);
            }
            return prev;
          });
        }, 300);
      }, 800);
    } catch (err: any) {
      setGroupError(err?.message || 'Tạo nhóm thất bại');
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Open add members modal
  const handleOpenAddMembers = () => {
    if (!selectedChatRoom || selectedChatRoom.type !== 'group') return;
    setModalTab('add-members');
    setShowGroupModal(true);
    setSelectedMemberIds([]);
    setAddMembersError(null);
    setAddMembersSuccess(null);
  };

  // Submit adding members
  const handleAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatRoom || selectedChatRoom.type !== 'group') return;
    if (selectedMemberIds.length === 0) { setAddMembersError('Chọn ít nhất 1 thành viên'); return; }
    setAddingMembers(true);
    setAddMembersError(null);
    setAddMembersSuccess(null);
    try {
      for (const uid of selectedMemberIds) {
        if (!selectedChatRoom.participants.includes(uid)) {
          // eslint-disable-next-line no-await-in-loop
          await joinGroup(selectedChatRoom.id, uid);
        }
      }
      setChatRooms(prev => prev.map(r => r.id === selectedChatRoom.id ? { ...r, participants: Array.from(new Set([...r.participants, ...selectedMemberIds])) } : r));
      setSelectedChatRoom(prev => prev ? { ...prev, participants: Array.from(new Set([...prev.participants, ...selectedMemberIds])) } : prev);
      setAddMembersSuccess('Đã thêm thành viên');
      setTimeout(() => setShowGroupModal(false), 900);
    } catch (err: any) {
      setAddMembersError(err?.message || 'Thêm thành viên thất bại');
    } finally { setAddingMembers(false); }
  };

  // Handler for searching user by phone
  const handleSearchByPhone = async () => {
    if (!phoneNumber.trim()) {
      setAddByPhoneError('Vui lòng nhập số điện thoại');
      return;
    }
    
    setSearchingUser(true);
    setAddByPhoneError(null);
    setFoundUser(null);
    
    try {
      const user = await searchUserByPhone(phoneNumber.trim());
      if (user) {
        setFoundUser(user);
      } else {
        setAddByPhoneError('Không tìm thấy người dùng với số điện thoại này');
      }
    } catch (error: any) {
      setAddByPhoneError(error.message || 'Tìm kiếm thất bại');
    } finally {
      setSearchingUser(false);
    }
  };

  // Handler for adding member by phone (not friend yet)
  const handleAddMemberByPhone = async () => {
    if (!selectedChatRoom || selectedChatRoom.type !== 'group' || !foundUser) return;
    
    setAddingByPhone(true);
    setAddByPhoneError(null);
    setAddByPhoneSuccess(null);
    
    try {
      await addMemberIfNotFriend(selectedChatRoom.id, foundUser.idUser);
      
      // Update local state
      setChatRooms(prev => prev.map(r => 
        r.id === selectedChatRoom.id 
          ? { ...r, participants: [...r.participants, foundUser.idUser] } 
          : r
      ));
      setSelectedChatRoom(prev => prev ? { 
        ...prev, 
        participants: [...prev.participants, foundUser.idUser] 
      } : prev);
      
      setAddByPhoneSuccess(`Đã thêm ${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || 'Đã thêm thành viên');
      setPhoneNumber('');
      setFoundUser(null);
      setTimeout(() => setShowGroupModal(false), 1500);
    } catch (error: any) {
      setAddByPhoneError(error.message || 'Không thể thêm thành viên');
    } finally {
      setAddingByPhone(false);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 1000) return 'Vừa xong';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} phút trước`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} giờ trước`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Video call functions
  const handleInitiateCall = async () => {
    if (!selectedChatRoom || !currentUser || !webRTCService) return;
    
    const otherUserId = selectedChatRoom.participants.find(id => id !== currentUser.id);
    if (!otherUserId) return;

    console.log('📞 Initiating call from:', currentUser.id, 'to:', otherUserId);

    let call: VideoCallDTO | null = null;

    try {
      // Initialize WebRTC connection first
      await webRTCService.initializeConnection('temp-id', otherUserId);
      
      // Test media access first before creating call in DB
      console.log('🎥 Testing media access...');
      const testStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Stop test stream immediately
      testStream.getTracks().forEach(track => track.stop());
      console.log('✅ Media access granted');
      
      // Now create the call in database since we know media works
      call = await initiateCall(currentUser.id, otherUserId);
      setActiveCall(call);
      setIsVideoCallVisible(true);
      callStartTimeRef.current = new Date();
      
      // Update WebRTC with real call ID
      await webRTCService.initializeConnection(call.id, otherUserId);
      
      // Setup WebRTC event handlers
      webRTCService.onLocalStreamReceived = (stream: MediaStream | null) => {
        console.log('📹 Local stream received (caller):', stream);
        setLocalStream(stream);
      };
      
      webRTCService.onRemoteStreamReceived = (stream: MediaStream | null) => {
        console.log('📹 Remote stream received (caller):', stream);
        setRemoteStream(stream);
        if (!stream) {
          setIsRemoteVideoEnabled(true);
        }
      };
      
      webRTCService.onRemoteVideoStatusChanged = (enabled: boolean) => {
        console.log('🎛️ Remote video status (caller):', enabled);
        setIsRemoteVideoEnabled(enabled);
      };

      webRTCService.onRemoteAudioStatusChanged = (enabled: boolean) => {
        console.log('🎚️ Remote audio status (caller):', enabled);
      };

      webRTCService.onCallEnded = () => {
        cleanupCall();
      };
      
      // Start the actual call
      console.log('🔄 Starting WebRTC call...');
      await webRTCService.startCall();
      console.log('✅ WebRTC call started successfully');
      setIsRemoteVideoEnabled(true);
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      
      // Cleanup if call was created but WebRTC failed
      if (call) {
        try {
          await endCall(call.id);
          console.log('🗑️ Cleaned up failed call from database');
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup call:', cleanupError);
        }
      }
      
      // Cleanup local state
      cleanupCall();
      
      // Show user-friendly error message
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        alert('Vui lòng cho phép quyền truy cập camera và microphone để thực hiện cuộc gọi video.');
      } else if (errorMsg.includes('NotFoundError')) {
        alert('Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị của bạn.');
      } else {
        alert('Không thể khởi tạo cuộc gọi. Vui lòng thử lại: ' + errorMsg);
      }
    }
  };

  const handleAcceptCall = async (call: VideoCallDTO) => {
    if (!webRTCService) return;
    
    try {
      console.log('📲 Accepting call:', call.id);
      setIncomingCall(null);
      setActiveCall(call);
      setIsVideoCallVisible(true);
      callStartTimeRef.current = new Date();
      
      const otherUserId = call.callerId === currentUser?.id ? call.calleeId : call.callerId;
      console.log('👥 Other user ID for callee:', otherUserId);
      
      // Initialize WebRTC connection
      await webRTCService.initializeConnection(call.id, otherUserId);
      
      // Setup WebRTC event handlers BEFORE answerCall
      webRTCService.onLocalStreamReceived = (stream: MediaStream | null) => {
        console.log('📹 Local stream received (callee):', stream);
        console.log('📹 Stream tracks:', stream ? stream.getTracks() : []);
        setLocalStream(stream);
      };
      
      webRTCService.onRemoteStreamReceived = (stream: MediaStream | null) => {
        console.log('📹 Remote stream received (callee):', stream);
        setRemoteStream(stream);
        if (!stream) {
          setIsRemoteVideoEnabled(true);
        }
      };

      webRTCService.onRemoteVideoStatusChanged = (enabled: boolean) => {
        console.log('🎛️ Remote video status (callee):', enabled);
        setIsRemoteVideoEnabled(enabled);
      };

      webRTCService.onRemoteAudioStatusChanged = (enabled: boolean) => {
        console.log('🎚️ Remote audio status (callee):', enabled);
      };
      
      webRTCService.onCallEnded = () => {
        cleanupCall();
      };
      
      // Answer the call as callee
      console.log('📞 Calling answerCall()...');
      await webRTCService.answerCall();
      console.log('✅ answerCall() completed');
  setIsRemoteVideoEnabled(true);
      
      // Send accept signal
      wsSend('/app/video-call/accept', { callId: call.id });
    } catch (error) {
      console.error('Failed to accept call:', error);
      alert('Không thể nhận cuộc gọi. Vui lòng thử lại.');
    }
  };

  const handleRejectCall = (call: VideoCallDTO) => {
    setIncomingCall(null);
    wsSend('/app/video-call/reject', { callId: call.id });
  };

  const handleToggleVideo = () => {
    if (!webRTCService) return;
    const isMuted = webRTCService.toggleVideo();
    setIsVideoEnabled(!isMuted);
  };

  const handleToggleAudio = () => {
    if (!webRTCService) return;
    const isMuted = webRTCService.toggleMute();
    setIsAudioEnabled(!isMuted);
  };

  const handleMinimizeCall = () => {
    setIsVideoCallMinimized(!isVideoCallMinimized);
  };

  // ==================================================
  // GROUP VIDEO CALL HANDLERS
  // ==================================================

  const handleStartGroupCall = useCallback(async () => {
    if (!selectedChatRoom || selectedChatRoom.type !== 'group') {
      alert('Vui lòng chọn một nhóm để gọi video');
      return;
    }

    if (!currentUser?.id) {
      alert('Không tìm thấy thông tin người dùng');
      return;
    }

    // Check if already in a call
    if (isGroupCallVisible || activeGroupCall) {
      alert('⚠️ Bạn đang trong cuộc gọi khác. Vui lòng kết thúc cuộc gọi hiện tại trước.');
      return;
    }
    
    if (isVideoCallVisible || activeCall) {
      alert('⚠️ Bạn đang trong cuộc gọi 1-1. Vui lòng kết thúc cuộc gọi hiện tại trước.');
      return;
    }

    try {
      const callData = await initiateGroupCall(selectedChatRoom.id, currentUser.id);
      setActiveGroupCall(callData);
      setIsGroupCallVisible(true);
    } catch (error) {
      console.error('Error starting group call:', error);
      alert('Không thể bắt đầu cuộc gọi nhóm');
    }
  }, [selectedChatRoom, currentUser, isGroupCallVisible, activeGroupCall, isVideoCallVisible, activeCall]);

  const handleJoinGroupCall = useCallback(async () => {
    if (!groupCallNotificationData) return;
    
    // Check if already in a call
    if (isGroupCallVisible || activeGroupCall) {
      alert('⚠️ Bạn đang trong cuộc gọi khác. Vui lòng kết thúc cuộc gọi hiện tại trước.');
      return;
    }
    
    if (isVideoCallVisible || activeCall) {
      alert('⚠️ Bạn đang trong cuộc gọi 1-1. Vui lòng kết thúc cuộc gọi hiện tại trước.');
      return;
    }
    
    if (!currentUser?.id) {
      alert('Không tìm thấy thông tin người dùng');
      return;
    }

    try {
      const callData = await joinGroupCall(
        groupCallNotificationData.id,
        currentUser.id
      );
      
      setActiveGroupCall(callData);
      setIsGroupCallVisible(true);
      setShowGroupCallNotification(false);
    } catch (error: any) {
      console.error('Error joining group call:', error);
      alert('Không thể tham gia cuộc gọi: ' + (error.response?.data?.message || error.message));
    }
  }, [groupCallNotificationData, currentUser, isGroupCallVisible, activeGroupCall, isVideoCallVisible, activeCall]);

  const handleDeclineGroupCall = () => {
    setShowGroupCallNotification(false);
    setGroupCallNotificationData(null);
  };

  const handleEndGroupCall = () => {
    setIsGroupCallVisible(false);
    setActiveGroupCall(null);
    setShowGroupCallNotification(false);
    setGroupCallNotificationData(null);
  };

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeCall && callStartTimeRef.current) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - callStartTimeRef.current!.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall]);

  const filteredChatRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="chat-container">
        <div className="chat-login-required">
          <h3>Vui lòng đăng nhập để sử dụng chat</h3>
          <a href="/login" className="login-link">Đăng nhập ngay</a>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Tin nhắn</h2>
          <div className="sidebar-actions">
            <button
              className="create-group-btn"
              title="Tạo nhóm mới"
              onClick={() => { setShowGroupModal(true); setModalTab('create'); }}
            >➕ Nhóm</button>
            {/* <button 
              className={`action-btn ${useFakeCamera ? 'active' : ''}`}
              title={useFakeCamera ? "Đang dùng camera giả (test)\nClick để dùng camera thật" : "Đang dùng camera thật\nClick để dùng camera giả (test trên 1 máy)"}
              onClick={() => {
                const newValue = !useFakeCamera;
                setUseFakeCamera(newValue);
                localStorage.setItem('useFakeCamera', newValue.toString());
                alert(newValue 
                  ? '🎭 Đã BẬT camera giả!\nBây giờ bạn có thể mở nhiều tab để test group call trên cùng 1 máy.\nMỗi tab sẽ có màu khác nhau.' 
                  : '📹 Đã TẮT camera giả!\nSẽ dùng camera thật.');
              }}
            >
              {useFakeCamera ? '🎭' : '📹'}
            </button> */}
            <button 
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {/* <div className="search-icon">🔍</div> */}
        </div>

        <div className="chat-rooms-list">
          {filteredChatRooms.map(room => (
            <div
              key={room.id}
              className={`chat-room-item ${selectedChatRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => handleSelectChatRoom(room)}
            >
              <div className="room-avatar">
                {room.avatar ? (
                  <img src={room.avatar} alt={room.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {room.isOnline && <div className="online-indicator"></div>}
              </div>
              
              <div className="room-info">
                <div className="room-header">
                  <h4 className="room-name">{room.name} {room.type === 'group' && <span className="badge-group">Nhóm</span>}</h4>
                  {room.lastMessageTime && (
                    <span className="last-time">{formatTime(room.lastMessageTime)}</span>
                  )}
                </div>
                
                <div className="room-footer">
                  <p className="last-message">{room.lastMessage || 'Chưa có tin nhắn'}</p>
                  {room.unreadCount > 0 && (
                    <span className="unread-badge">{room.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {selectedChatRoom ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-info">
                <div className="chat-avatar">
                  {selectedChatRoom.avatar ? (
                    <img src={selectedChatRoom.avatar} alt={selectedChatRoom.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedChatRoom.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {selectedChatRoom.isOnline && <div className="online-indicator"></div>}
                </div>
                <div>
                  <h3>{selectedChatRoom.name}</h3>
                  <p className="chat-status">
                    {selectedChatRoom.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                  </p>
                </div>
              </div>
              
              <div className="chat-actions">
                <button 
                  className="action-btn" 
                  onClick={handleViewImages}
                  title="Xem tất cả ảnh"
                >
                  🖼️
                </button>
                <button 
                  className="action-btn" 
                  onClick={handleViewFiles}
                  title="Xem tất cả file"
                >
                  📁
                </button>
                <button className="action-btn">📞</button>
                {selectedChatRoom.type === 'private' && (
                  <button 
                    className="action-btn" 
                    onClick={handleInitiateCall}
                    disabled={!!activeCall}
                    title="Gọi video 1-1"
                  >
                    📹
                  </button>
                )}
                {selectedChatRoom.type === 'group' && (
                  <>
                    <button 
                      className="action-btn" 
                      onClick={handleStartGroupCall}
                      disabled={!!activeGroupCall || !!activeCall}
                      title="Gọi video nhóm"
                    >
                      📹
                    </button>
                    <button 
                      className="action-btn" 
                      title="Quản lý thành viên" 
                      onClick={() => navigate(`/groups/${selectedChatRoom.id}/members`)}
                    >
                      👥
                    </button>
                    {selectedChatRoom.role === 'ADMIN' && (
                      <>
                        <button className="action-btn" title="Thêm thành viên" onClick={handleOpenAddMembers}>➕</button>
                        <button 
                          className="action-btn delete-btn" 
                          title="Xóa nhóm" 
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </>
                )}
                {/* <button className="action-btn">⚙️</button> */}
              </div>
            </div>

            {/* Messages Area */}
            <div 
              className="messages-area" 
              ref={messagesAreaRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                
                // Detect if user has scrolled to bottom area (near bottom)
                const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
                if (isNearBottom) {
                  hasScrolledToBottomRef.current = true;
                }
                
                // Chỉ load more khi: đã scroll xuống bottom ít nhất 1 lần + đang scroll gần đầu
                if (
                  hasScrolledToBottomRef.current && 
                  target.scrollTop < 100 && 
                  !loadingMoreMessages && 
                  hasMoreMessages
                ) {
                  loadMoreMessages();
                }
              }}
            >
              <div style={{ flex: 1 }} /> {/* Spacer để đẩy messages xuống bottom */}
              
              {loadingMoreMessages && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#888' }}>
                  ⏳ Đang tải thêm tin nhắn...
                </div>
              )}
              
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`message ${message.isOwn ? 'own' : 'other'}`}
                >
                  {!message.isOwn && (
                    <div className="message-avatar">
                      {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={message.senderName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {!message.isOwn && (
                      <span className="message-sender">{message.senderName}</span>
                    )}
                    <div className="message-bubble-wrapper">
                      <div className="message-bubble">
                        {message.type === 'image' && message.imageUrl ? (
                          <img 
                            src={message.imageUrl} 
                            alt="Attachment" 
                            className="message-image"
                            onClick={() => window.open(message.imageUrl, '_blank')}
                          />
                        ) : message.type === 'file' && message.fileUrl && isVideoFile(message.fileName, message.fileUrl) ? (
                          <video
                            className="message-video"
                            src={message.fileUrl}
                            controls
                            preload="metadata"
                          />
                        ) : message.type === 'file' && message.fileUrl ? (
                          <div className="file-attachment">
                            <div className="file-icon">
                              📎
                            </div>
                            <div className="file-info">
                              <div className="file-name">{message.fileName}</div>
                              <div className="file-size">
                                {message.fileSize ? (message.fileSize / 1024).toFixed(2) + ' KB' : 'Unknown size'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadFile(message.fileUrl!, message.fileName)}
                              className="file-download-btn"
                              title="Tải xuống file"
                              disabled={downloadingFiles[message.fileUrl!]}
                            >
                              {downloadingFiles[message.fileUrl!] ? '⏳ Đang tải...' : '⬇️ Tải xuống'}
                            </button>
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                      {message.isOwn && (
                        <div className="message-actions">
                          <button
                            className="message-menu-btn"
                            onClick={() => {
                              if (contextMenuMessage?.id === message.id) {
                                setContextMenuMessage(null);
                              } else {
                                setContextMenuMessage(message);
                              }
                            }}
                            title="Tùy chọn"
                          >
                            ⋮
                          </button>
                          {contextMenuMessage?.id === message.id && (
                            <div className="message-dropdown-menu">
                              <button
                                className="dropdown-item delete-item"
                                onClick={handleDeleteMessage}
                                disabled={deletingMessage}
                              >
                                {deletingMessage ? '⏳ Đang xóa...' : '🗑️ Xóa tin nhắn'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="message-time">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form className="message-input-area" onSubmit={handleSendMessage}>
              <div className="input-container">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handleImageSelect}
                  aria-label="Upload image"
                />
                <input
                  type="file"
                  ref={docFileInputRef}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  className="hidden-file-input"
                  onChange={handleFileSelect}
                  aria-label="Upload file"
                />
                <input
                  type="file"
                  ref={videoFileInputRef}
                  accept="video/*"
                  className="hidden-file-input"
                  onChange={handleVideoSelect}
                  aria-label="Upload video"
                />
                <button 
                  type="button" 
                  className="attachment-btn image-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  title="Gửi ảnh"
                >
                   ️
                </button>
                <button 
                  type="button" 
                  className="attachment-btn video-btn" 
                  onClick={() => videoFileInputRef.current?.click()}
                  title="Gửi video"
                >
                  🎬
                </button>
                                <button 
                  type="button" 
                  className="attachment-btn file-btn" 
                  onClick={() => docFileInputRef.current?.click()}
                  title="Gửi file"
                >
                  📎
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="message-input"
                />
                <button type="button" className="emoji-btn">😊</button>
                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={!newMessage.trim()}
                >
                  ➤
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-message">
              <h3>Chào mừng đến với ChatWeb!</h3>
              <p>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Call Components */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => handleAcceptCall(incomingCall)}
          onReject={() => handleRejectCall(incomingCall)}
        />
      )}

      {activeCall && (
        <VideoCallInterface
          isVisible={isVideoCallVisible}
          localStream={localStream}
          remoteStream={remoteStream}
          friendName={currentUser?.id === activeCall.callerId ? activeCall.calleeName : activeCall.callerName}
          friendAvatar={currentUser?.id === activeCall.callerId ? activeCall.calleeAvatar : activeCall.callerAvatar}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          callDuration={callDuration}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onEndCall={handleEndCall}
          onMinimize={handleMinimizeCall}
          isMinimized={isVideoCallMinimized}
        />
      )}

      {/* Group Video Call Notification */}
      {showGroupCallNotification && groupCallNotificationData && (
        <div className="group-call-notification">
          <div className="notification-content">
            <h3>📞 Cuộc gọi video nhóm</h3>
            <p>
              <strong>{groupCallNotificationData.initiatorName}</strong> đang gọi trong nhóm{' '}
              <strong>{groupCallNotificationData.groupName}</strong>
            </p>
            <p className="participant-info">
              👥 {groupCallNotificationData.participants?.length || 0} người đang trong cuộc gọi
            </p>
            <div className="notification-actions">
              <button className="btn-join" onClick={handleJoinGroupCall}>
                ✅ Tham gia
              </button>
              <button className="btn-decline" onClick={handleDeclineGroupCall}>
                ❌ Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Video Call Interface */}
      {activeGroupCall && isGroupCallVisible && (
        <GroupVideoCallInterface
          callId={activeGroupCall.id}
          groupId={activeGroupCall.groupId}
          groupName={activeGroupCall.groupName}
          initiatorId={activeGroupCall.initiatorId}
          currentUserId={currentUser?.id || ''}
          participants={activeGroupCall.participants}
          onCallEnded={handleEndGroupCall}
          stompClient={getClient()}
        />
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="group-modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h3>{modalTab === 'create' ? 'Tạo nhóm chat' : 'Thêm thành viên'}</h3>
              <button onClick={() => setShowGroupModal(false)}>✖</button>
            </div>
            <div className="group-modal-tabs">
              <button className={modalTab === 'create' ? 'active' : ''} onClick={() => setModalTab('create')}>Tạo nhóm</button>
              {selectedChatRoom?.type === 'group' && selectedChatRoom.role === 'ADMIN' && (
                <>
                  <button className={modalTab === 'add-members' ? 'active' : ''} onClick={() => { setModalTab('add-members'); setSelectedMemberIds([]); setAddMembersError(null); setAddMembersSuccess(null); }}>Thêm bạn bè</button>
                  <button className={modalTab === 'add-by-phone' ? 'active' : ''} onClick={() => { setModalTab('add-by-phone'); setPhoneNumber(''); setFoundUser(null); setAddByPhoneError(null); setAddByPhoneSuccess(null); }}>Thêm bằng SĐT</button>
                </>
              )}
            </div>
            {modalTab === 'create' && (
              <form onSubmit={handleCreateGroup} className="group-form">
                <label>Tên nhóm</label>
                <input
                  type="text"
                  value={groupName}
                  placeholder="Ví dụ: Dự án A"
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <label>Chọn thành viên</label>
                <div className="friends-select-list">
                  {friendsList.filter(f => f.userId !== currentUser.id).map(f => (
                    <div key={f.userId} className={`friend-select-item ${selectedMemberIds.includes(f.userId) ? 'selected' : ''}`} onClick={() => toggleMember(f.userId)}>
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(f.userId)}
                        onChange={() => toggleMember(f.userId)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Chọn ${f.firstName} ${f.lastName}`.trim()}
                        title={`Chọn ${f.firstName} ${f.lastName}`.trim()}
                      />
                      <span>{`${f.firstName} ${f.lastName}`.trim()}</span>
                    </div>
                  ))}
                </div>
                {groupError && <div className="group-error">{groupError}</div>}
                {groupSuccess && <div className="group-success">{groupSuccess}</div>}
                <button type="submit" className="create-group-submit" disabled={creatingGroup}>{creatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}</button>
              </form>
            )}
            {modalTab === 'add-members' && selectedChatRoom?.type === 'group' && (
              <form onSubmit={handleAddMembers} className="group-form">
                <label>Chọn thành viên để thêm</label>
                <div className="friends-select-list">
                  {friendsList
                    .filter(f => f.userId !== currentUser.id && !selectedChatRoom.participants.includes(f.userId))
                    .map(f => (
                      <div key={f.userId} className={`friend-select-item ${selectedMemberIds.includes(f.userId) ? 'selected' : ''}`} onClick={() => toggleMember(f.userId)}>
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(f.userId)}
                          onChange={() => toggleMember(f.userId)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Chọn ${f.firstName} ${f.lastName}`.trim()}
                          title={`Chọn ${f.firstName} ${f.lastName}`.trim()}
                        />
                        <span>{`${f.firstName} ${f.lastName}`.trim()}</span>
                      </div>
                    ))}
                  {friendsList.filter(f => f.userId !== currentUser.id && !selectedChatRoom.participants.includes(f.userId)).length === 0 && (
                    <div className="empty-hint">Không còn bạn bè nào để thêm</div>
                  )}
                </div>
                {addMembersError && <div className="group-error">{addMembersError}</div>}
                {addMembersSuccess && <div className="group-success">{addMembersSuccess}</div>}
                <button type="submit" className="create-group-submit" disabled={addingMembers}>{addingMembers ? 'Đang thêm...' : 'Thêm'}</button>
              </form>
            )}
            {modalTab === 'add-by-phone' && selectedChatRoom?.type === 'group' && (
              <div className="group-form">
                <label>Tìm kiếm người dùng bằng số điện thoại</label>
                <div className="phone-search-container">
                  <input
                    type="tel"
                    value={phoneNumber}
                    placeholder="Nhập số điện thoại"
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchByPhone()}
                  />
                  <button 
                    type="button" 
                    onClick={handleSearchByPhone}
                    disabled={searchingUser}
                    className="search-phone-btn"
                  >
                    {searchingUser ? '⏳ Đang tìm...' : '🔍 Tìm kiếm'}
                  </button>
                </div>
                
                {foundUser && (
                  <div className="found-user-card">
                    <div className="found-user-info">
                      {foundUser.avatar ? (
                        <img src={foundUser.avatar} alt="Avatar" className="found-user-avatar" />
                      ) : (
                        <div className="found-user-avatar-placeholder">
                          {(foundUser.firstName || foundUser.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="found-user-details">
                        <div className="found-user-name">
                          {`${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.username}
                        </div>
                        {foundUser.phoneNumber && (
                          <div className="found-user-phone">{foundUser.phoneNumber}</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMemberByPhone}
                      disabled={addingByPhone}
                      className="add-found-user-btn"
                    >
                      {addingByPhone ? '⏳ Đang thêm...' : '➕ Thêm vào nhóm'}
                    </button>
                  </div>
                )}
                
                {addByPhoneError && <div className="group-error">{addByPhoneError}</div>}
                {addByPhoneSuccess && <div className="group-success">{addByPhoneSuccess}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="group-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="group-modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h3>⚠️ Xác nhận xóa nhóm</h3>
              <button onClick={() => setShowDeleteConfirm(false)}>✖</button>
            </div>
            <div className="delete-confirm-content">
              <p>Bạn có chắc chắn muốn xóa nhóm <strong>{selectedChatRoom?.name}</strong>?</p>
              <p className="warning-text">Tất cả tin nhắn và thành viên sẽ bị xóa vĩnh viễn!</p>
            </div>
            <div className="delete-confirm-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingGroup}
              >
                Hủy
              </button>
              <button 
                className="delete-btn-confirm" 
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
              >
                {deletingGroup ? 'Đang xóa...' : 'Xóa nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Images Modal */}
      {showImagesModal && (
        <div className="group-modal-overlay" onClick={() => setShowImagesModal(false)}>
          <div className="group-modal images-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h3>🖼️ Tất cả ảnh trong cuộc trò chuyện</h3>
              <button onClick={() => setShowImagesModal(false)}>✖</button>
            </div>
            <div className="images-grid">
              {loadingImages ? (
                <div className="loading-message">Đang tải ảnh...</div>
              ) : conversationImages.length === 0 ? (
                <div className="empty-hint">Chưa có ảnh nào trong cuộc trò chuyện này</div>
              ) : (
                conversationImages.map((msg) => (
                  <div key={msg.id} className="image-item">
                    <img 
                      src={msg.imageUrl} 
                      alt="Chat attachment"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                    <div className="image-info">
                      <span className="image-sender">{getSenderName(msg.sender)}</span>
                      <span className="image-time">{formatMessageTime(new Date(msg.createdAt))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Files Modal */}
      {showFilesModal && (
        <div className="group-modal-overlay" onClick={() => setShowFilesModal(false)}>
          <div className="group-modal files-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h3>📁 Tất cả file trong cuộc trò chuyện</h3>
              <button onClick={() => setShowFilesModal(false)}>✖</button>
            </div>
            <div className="files-list">
              {loadingFiles ? (
                <div className="loading-message">Đang tải file...</div>
              ) : conversationFiles.length === 0 ? (
                <div className="empty-hint">Chưa có file nào trong cuộc trò chuyện này</div>
              ) : (
                conversationFiles.map((msg) => (
                  <div key={msg.id} className="file-list-item">
                    <div className="file-icon-large">📎</div>
                    <div className="file-details">
                      <div className="file-name-large">{msg.fileName}</div>
                      <div className="file-meta">
                        <span className="file-sender">{getSenderName(msg.sender)}</span>
                        <span className="file-separator">•</span>
                        <span className="file-size">
                          {msg.fileSize ? (msg.fileSize / 1024).toFixed(2) + ' KB' : 'Unknown size'}
                        </span>
                        <span className="file-separator">•</span>
                        <span className="file-time">{formatMessageTime(new Date(msg.createdAt))}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(msg.fileUrl!, msg.fileName)}
                      className="file-download-btn-large"
                      title="Tải xuống file"
                      disabled={downloadingFiles[msg.fileUrl!]}
                    >
                      {downloadingFiles[msg.fileUrl!] ? '⏳' : '⬇️'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
