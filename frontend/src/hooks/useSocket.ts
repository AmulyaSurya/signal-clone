"use client";

import { useEffect, useRef, useCallback } from "react";
import { WS_URL } from "@/lib/api";
import { getToken } from "@/lib/api";
import { WsEvent } from "@/types";

type Handler = (event: WsEvent) => void;

/**
 * Maintains a single websocket connection for the whole app and lets any
 * component subscribe to incoming events. Auto-reconnects on drop.
 */
export function useSocket(onEvent: Handler, enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onEvent);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !enabled) return;

    const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as WsEvent;
        handlerRef.current(data);
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (enabled) {
        reconnectTimer.current = setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearInterval(heartbeat);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "typing", conversation_id: conversationId, is_typing: isTyping })
      );
    }
  }, []);

  return { sendTyping };
}
