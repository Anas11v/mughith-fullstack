import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { useStore } from '../store/useStore';

let locationSocket: Socket | null = null;
let voipSocket: Socket | null = null;

const buildSocket = (path: '/location' | '/voip'): Socket => {
  const token = useStore.getState().accessToken;
  return io(`${API_BASE_URL}${path}`, {
    auth: token ? { token } : undefined,
    transports: ['websocket'],
    autoConnect: true,
  });
};

export const getLocationSocket = (): Socket => {
  if (!locationSocket || locationSocket.disconnected) {
    locationSocket = buildSocket('/location');
  }
  return locationSocket;
};

export const getVoipSocket = (): Socket => {
  if (!voipSocket || voipSocket.disconnected) {
    voipSocket = buildSocket('/voip');
  }
  return voipSocket;
};

export const disconnectSockets = (): void => {
  locationSocket?.disconnect();
  voipSocket?.disconnect();
  locationSocket = null;
  voipSocket = null;
};
