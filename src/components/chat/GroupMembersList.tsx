import React, { useState } from 'react';
import { removeMemberFromGroup } from '../../api/chat/chatApi';
import './GroupMembersList.css';

interface Member {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  role: 'ADMIN' | 'MEMBER';
}

interface GroupMembersListProps {
  groupId: string;
  members: Member[];
  currentUserId: string;
  currentUserRole: 'ADMIN' | 'MEMBER';
  creatorId: string;
  onMemberRemoved: (memberId: string) => void;
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({
  groupId,
  members,
  currentUserId,
  currentUserRole,
  creatorId,
  onMemberRemoved
}) => {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; member: Member | null }>({
    show: false,
    member: null
  });

  const handleRemoveClick = (member: Member) => {
    setConfirmModal({ show: true, member });
  };

  const handleConfirmRemove = async () => {
    if (!confirmModal.member) return;
    
    try {
      console.log('🗑️ Removing member:', confirmModal.member);
      console.log('📤 API Call Params:', { 
        groupId, 
        userId: confirmModal.member.userId, 
        requesterId: currentUserId,
        userIdType: typeof confirmModal.member.userId,
        requesterIdType: typeof currentUserId
      });
      
      if (!confirmModal.member.userId) {
        alert('❌ Lỗi: Không tìm thấy userId của thành viên. Data: ' + JSON.stringify(confirmModal.member));
        return;
      }
      
      setRemovingMemberId(confirmModal.member.userId);
      await removeMemberFromGroup(groupId, confirmModal.member.userId, currentUserId);
      console.log('✅ Member removed successfully');
      onMemberRemoved(confirmModal.member.userId);
      setConfirmModal({ show: false, member: null });
    } catch (error: any) {
      console.error('❌ Failed to remove member:', error);
      alert(`Lỗi xóa thành viên:\n${error.message || 'Không thể xóa thành viên'}\n\nChi tiết: ${JSON.stringify(error)}`);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCancelRemove = () => {
    setConfirmModal({ show: false, member: null });
  };

  const canRemoveMember = (member: Member): boolean => {
    // Không xóa được creator
    if (member.id === creatorId) return false;
    
    // Admin có thể xóa member khác (trừ creator)
    if (currentUserRole === 'ADMIN' && member.id !== currentUserId) return true;
    
    // Member có thể tự rời nhóm
    if (member.id === currentUserId) return true;
    
    return false;
  };

  return (
    <div className="group-members-container">
      <h3 className="members-title">Thành viên ({members.length})</h3>
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              <div className="member-avatar">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="member-details">
                <span className="member-name">{member.username}</span>
                <span className={`member-role ${member.role.toLowerCase()}`}>
                  {member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </div>
            </div>
            {canRemoveMember(member) && (
              <button
                className="remove-member-btn"
                onClick={() => handleRemoveClick(member)}
                disabled={removingMemberId === member.id}
                title={member.id === currentUserId ? 'Rời khỏi nhóm' : 'Xóa thành viên'}
              >
                {removingMemberId === member.id ? '...' : member.id === currentUserId ? '🚪 Rời' : '❌'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && confirmModal.member && (
        <div className="modal-overlay" onClick={handleCancelRemove}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Xác nhận</h3>
            <p>
              {confirmModal.member.id === currentUserId
                ? 'Bạn có chắc muốn rời khỏi nhóm này?'
                : `Bạn có chắc muốn xóa ${confirmModal.member.username} khỏi nhóm?`}
            </p>
            <div className="modal-actions">
              <button onClick={handleConfirmRemove} className="btn-confirm">
                Xác nhận
              </button>
              <button onClick={handleCancelRemove} className="btn-cancel">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMembersList;
