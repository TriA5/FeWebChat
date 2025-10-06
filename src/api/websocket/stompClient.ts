import SockJS from 'sockjs-client';
import { Client, IMessage, Stomp } from '@stomp/stompjs';
import { getToken } from '../util/JwtService';

let client: Client | null = null;
const pendingSends: Array<{ destination: string; body: any }> = [];

export function connect(onConnect?: () => void, onError?: (err: any) => void) {
  if (client && client.connected) {
    onConnect && onConnect();
    return client;
  }
  const token = getToken();
  if (!token) {
    onError && onError('No JWT token found');
    return null;
  }
  const socket = new SockJS('http://localhost:8080/ws');
  client = Stomp.over(socket as any);
  client.connectHeaders = { Authorization: `Bearer ${token}` };
  client.reconnectDelay = 5000;
  client.onConnect = () => {
    // Flush pending sends
    while (pendingSends.length) {
      const msg = pendingSends.shift()!;
      try {
        client!.publish({ destination: msg.destination, body: JSON.stringify(msg.body) });
      } catch (e) {
        console.error('Failed to flush pending message', e);
      }
    }
    onConnect && onConnect();
  };
  client.onStompError = (frame) => {
    console.error('STOMP error:', frame);
    onError && onError(frame);
  };
  client.activate();
  return client;
}

export function subscribe(destination: string, callback: (message: IMessage) => void) {
  if (!client || !client.connected) {
    console.error('WebSocket not connected');
    return null;
  }
  return client.subscribe(destination, callback);
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
