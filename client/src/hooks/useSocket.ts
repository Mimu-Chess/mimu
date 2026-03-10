import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_ORIGIN } from '../lib/server';
let socket: Socket | null = null;
export function getSocket(): Socket {
    if (!socket) {
        socket = io(SERVER_ORIGIN, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
        });
    }
    return socket;
}
export function useSocket() {
    const socketRef = useRef<Socket>(getSocket());
    useEffect(() => {
        const s = socketRef.current;
        if (!s.connected) {
            s.connect();
        }
        return () => {
        };
    }, []);
    const emit = useCallback((event: string, ...args: any[]) => {
        return socketRef.current.emit(event, ...args);
    }, []);
    const on = useCallback((event: string, handler: (...args: any[]) => void) => {
        socketRef.current.on(event, handler);
        return () => {
            socketRef.current.off(event, handler);
        };
    }, []);
    const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
        socketRef.current.off(event, handler);
    }, []);
    return { socket: socketRef.current, emit, on, off };
}
