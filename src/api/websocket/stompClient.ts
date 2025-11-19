import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { API_BASE_URL } from '../API_BASE_URL';

let client: Client | null = null;
const pendingSends: Array<{ destination: string; body: any }> = [];
const connectCallbacks: Array<() => void> = [];

// Create client only once
function createClient() {
  if (client) return client;
  
  console.log('🔌 Creating new WebSocket client...');
  
  client = new Client({
    brokerURL: undefined, // We'll use webSocketFactory instead
    webSocketFactory: () => new SockJS(`https://unpessimistically-unbewailed-christy.ngrok-free.dev/api/ws`) as any,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: (str) => {
      // Uncomment for detailed STOMP debugging
      // console.log('STOMP:', str);
    },
    onConnect: () => {
      console.log('✅ WebSocket CONNECTED');
      
      // Flush pending sends
      while (pendingSends.length) {
        const msg = pendingSends.shift()!;
        try {
          client!.publish({ destination: msg.destination, body: JSON.stringify(msg.body) });
        } catch (e) {
          console.error('Failed to flush pending message', e);
        }
      }
      
      // Call all pending callbacks
      while (connectCallbacks.length) {
        const cb = connectCallbacks.shift()!;
        try {
          cb();
        } catch (e) {
          console.error('Error in connect callback:', e);
        }
      }
    },
    onStompError: (frame) => {
      console.error('❌ STOMP error:', frame.headers['message']);
      console.error('Details:', frame.body);
    },
    onWebSocketClose: () => {
      console.warn('⚠️ WebSocket connection closed');
    },
    onWebSocketError: (error) => {
      console.error('❌ WebSocket error:', error);
    }
  });
  
  return client;
}

export function connect(onConnect?: () => void, onError?: (err: any) => void) {
  const currentClient = createClient();
  
  if (currentClient.connected) {
    console.log('✅ Already connected');
    onConnect && onConnect();
    return currentClient;
  }
  
  // Add callback to queue if provided
  if (onConnect) {
    connectCallbacks.push(onConnect);
  }
  
  // Activate if not already active
  if (!currentClient.active) {
    console.log('🚀 Activating WebSocket connection...');
    currentClient.activate();
  } else {
    console.log('⏳ WebSocket connection in progress...');
  }
  
  return currentClient;
}

export function subscribe(destination: string, callback: (message: IMessage) => void) {
  const currentClient = createClient();
  
  if (!currentClient.connected) {
    console.warn('⚠️ WebSocket not connected yet. Waiting for connection before subscribe:', destination);
    
    // Wait for connection then subscribe
    connect(() => {
      if (currentClient && currentClient.connected) {
        console.log('✅ Now subscribing to:', destination);
        currentClient.subscribe(destination, callback);
      }
    });
    
    return null;
  }
  
  console.log('✅ Subscribing to:', destination);
  return currentClient.subscribe(destination, callback);
}

export function send(destination: string, body: any) {
  if (!client || !client.connected) {
    // Queue and ensure connection
    pendingSends.push({ destination, body });
    connect();
    return;
  }
  client.publish({ destination, body: JSON.stringify(body) });
}

export function disconnect() {
  if (client) {
    client.deactivate();
    client = null;
  }
}

export function getClient() {
  return client;
}
