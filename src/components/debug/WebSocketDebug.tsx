import React, { useEffect, useState } from 'react';
import { getClient } from '../../api/websocket/stompClient';

/**
 * WebSocket Debug Component
 * Shows WebSocket connection status and subscriptions
 * Add this component to Chat.tsx temporarily for debugging
 */
const WebSocketDebug: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const client = getClient();
      
      if (client) {
        setIsConnected(client.connected);
        
        // Get active subscriptions (if available)
        const subs: string[] = [];
        // @ts-ignore - accessing private property for debugging
        if (client.subscriptions) {
          // @ts-ignore
          Object.keys(client.subscriptions).forEach(key => {
            subs.push(key);
          });
        }
        setSubscriptions(subs);
      } else {
        setIsConnected(false);
        setSubscriptions([]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 99999,
        maxWidth: '300px',
        maxHeight: '200px',
        overflow: 'auto',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        WebSocket Debug
      </div>
      <div>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      <div style={{ marginTop: '5px' }}>
        Subscriptions ({subscriptions.length}):
      </div>
      <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '10px' }}>
        {subscriptions.length === 0 && <li>No subscriptions</li>}
        {subscriptions.map((sub, idx) => (
          <li key={idx}>{sub}</li>
        ))}
      </ul>
    </div>
  );
};

export default WebSocketDebug;
