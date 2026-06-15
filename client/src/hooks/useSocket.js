import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const subscribe = useCallback((id, type) => {
    socketRef.current?.emit('subscribe', { id, type });
  }, []);

  const unsubscribe = useCallback((id, type) => {
    socketRef.current?.emit('unsubscribe', { id, type });
  }, []);

  const onCheckResult = useCallback((callback) => {
    socketRef.current?.on('check:result', callback);
    return () => socketRef.current?.off('check:result', callback);
  }, []);

  const onCircuitChange = useCallback((callback) => {
    socketRef.current?.on('circuit:change', callback);
    return () => socketRef.current?.off('circuit:change', callback);
  }, []);

  return { subscribe, unsubscribe, onCheckResult, onCircuitChange };
};
