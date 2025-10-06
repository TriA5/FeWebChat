import React from 'react';
import { VideoCallDTO } from '../../api/videocall/videoCallApi';
import './IncomingCallModal.css';

interface IncomingCallModalProps {
  call: VideoCallDTO;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ call, onAccept, onReject }) => {
  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        <div className="caller-info">
          <div className="caller-avatar">
            {call.callerAvatar ? (
              <img src={call.callerAvatar} alt={call.callerName} />
            ) : (
              <div className="avatar-placeholder">
                {call.callerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="caller-details">
            <h3>{call.callerName}</h3>
            <p>Cuộc gọi video đến...</p>
          </div>
        </div>
        
        <div className="call-actions">
          <button className="reject-btn" onClick={onReject}>
            <span className="btn-icon">📞</span>
            <span>Từ chối</span>
          </button>
          <button className="accept-btn" onClick={onAccept}>
            <span className="btn-icon">📹</span>
            <span>Chấp nhận</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;