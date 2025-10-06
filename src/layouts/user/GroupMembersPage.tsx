import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupMembers } from '../../api/chat/chatApi';
import GroupMembersList from '../../components/chat/GroupMembersList';
import { getUserInfo } from '../../api/user/loginApi';
import './GroupMembersPage.css';

interface GroupMember {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  role: 'ADMIN' | 'MEMBER';
}

const GroupMembersPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [creatorId, setCreatorId] = useState<string>('');

  useEffect(() => {
    const user = getUserInfo();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadMembers = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await getGroupMembers(groupId);
      console.log('📋 Loaded group members:', data);
      setMembers(data);
      
      // Find current user role
      const user = getUserInfo();
      const currentMember = data.find((m: GroupMember) => m.userId === user?.id);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
      
      // Find creator (first ADMIN or first member)
      const admin = data.find((m: GroupMember) => m.role === 'ADMIN');
      if (admin) {
        setCreatorId(admin.userId);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberRemoved = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.userId !== memberId));
    // If removed member is current user, redirect to chat
    if (currentUser && memberId === currentUser.id) {
      alert('Bạn đã bị xóa khỏi nhóm');
      navigate('/chat');
    }
  };

  const handleBackToChat = () => {
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="group-members-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải danh sách thành viên...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-members-page">
        <div className="error-container">
          <h3>❌ Lỗi</h3>
          <p>{error}</p>
          <button onClick={handleBackToChat} className="back-btn">
            Quay lại Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-members-page">
      <div className="page-header">
        <button onClick={handleBackToChat} className="back-button">
          ← Quay lại
        </button>
        <h1>Quản lý thành viên nhóm</h1>
      </div>
      
      <div className="page-content">
        {groupId && currentUser && (
          <GroupMembersList
            groupId={groupId}
            members={members}
            currentUserId={currentUser.id}
            currentUserRole={currentUserRole}
            creatorId={creatorId}
            onMemberRemoved={handleMemberRemoved}
          />
        )}
      </div>
    </div>
  );
};

export default GroupMembersPage;
