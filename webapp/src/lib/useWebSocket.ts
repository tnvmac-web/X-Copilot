import { useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  url: string;
  token?: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      try {
        const wsUrl = url.replace(/^http/, "ws");
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setStatus("open");
          onOpenRef.current?.();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessageRef.current?.(data);
          } catch {
            onMessageRef.current?.({ raw: event.data });
          }
        };

        ws.onclose = () => {
          setStatus("closed");
          onCloseRef.current?.();

          if (reconnect && !cancelled) {
            reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
          }
        };

        ws.onerror = (error) => {
          onErrorRef.current?.(error);
        };

        wsRef.current = ws;
      } catch (error) {
        onErrorRef.current?.(error as Event);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [url, token, reconnect, reconnectInterval]);

  const send = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { status, send };
}