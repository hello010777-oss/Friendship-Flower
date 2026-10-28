import { useEffect, useState, useRef, useCallback } from 'react';
import {
  saveRoomToCache,
  loadRoomFromCache,
  addScanLog,
  type CachedRoomData,
} from './storage';

export type StageType = 'accumulating' | 'ready_to_blow' | 'blowing' | 'blooming' | 'ending';

export interface RoomState {
  roomId: string;
  totalSeeds: number;
  scannedSeeds: number[];
  stage: StageType;
  lastUpdated: number;
  customBgUrl: string | null;
  endingImageUrl?: string | null;
  bgDim?: number;
  bgPreset: string;
}

export function useRoomSync(roomId: string, role: 'display' | 'scanner' | 'admin') {
  const [room, setRoom] = useState<RoomState>({
    roomId,
    totalSeeds: 16,
    scannedSeeds: [],
    stage: 'accumulating',
    lastUpdated: Date.now(),
    customBgUrl: null,
    endingImageUrl: null,
    bgDim: 0.25,
    bgPreset: 'spring_meadow',
  });

  const [connected, setConnected] = useState(false);
  const [lastScannedSeed, setLastScannedSeed] = useState<{
    seedNumber: number;
    isNew: boolean;
    timestamp: number;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // 1. Load initial cached state from IndexedDB/localStorage first (fast offline/refresh recovery)
  useEffect(() => {
    let active = true;
    loadRoomFromCache(roomId).then((cached) => {
      if (cached && active) {
        setRoom((prev) => ({
          ...prev,
          ...cached,
          roomId,
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [roomId]);

  // Save room updates to browser cache whenever room changes
  const updateAndCacheRoom = useCallback((newRoom: RoomState) => {
    setRoom(newRoom);
    saveRoomToCache(newRoom as CachedRoomData);
  }, []);

  // Broadcast Channel setup for instant same-browser cross-tab sync
  useEffect(() => {
    try {
      const bc = new BroadcastChannel(`dandelion_channel_${roomId}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'sync' && msg.room) {
          updateAndCacheRoom(msg.room);
        } else if (msg.type === 'scan_result') {
          if (msg.room) updateAndCacheRoom(msg.room);
          setLastScannedSeed({
            seedNumber: msg.seedNumber,
            isNew: msg.isNew,
            timestamp: Date.now(),
          });
        }
      };
      return () => {
        bc.close();
      };
    } catch {
      // BroadcastChannel might not be supported in older envs
    }
  }, [roomId, updateAndCacheRoom]);

  // WebSocket connection & auto-reconnect
  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnected(true);
          ws.send(JSON.stringify({ type: 'join', roomId, role }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'sync' && data.room) {
              updateAndCacheRoom(data.room);
            } else if (data.type === 'scan_result') {
              if (data.room) updateAndCacheRoom(data.room);
              setLastScannedSeed({
                seedNumber: data.seedNumber,
                isNew: data.isNew,
                timestamp: Date.now(),
              });
              if (data.isNew) {
                addScanLog(roomId, data.seedNumber);
              }
            } else if (data.type === 'state_changed') {
              if (data.room) updateAndCacheRoom(data.room);
            } else if (data.type === 'reset') {
              if (data.room) updateAndCacheRoom(data.room);
            } else if (data.type === 'config_updated') {
              if (data.room) updateAndCacheRoom(data.room);
            }
          } catch (err) {
            console.error('Parse WS message error:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnected(false);
          // Try reconnect after 2 seconds
          reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // Fallback reconnection
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      }
    }

    connect();

    // Fallback polling for REST sync every 1.2 seconds in case WS is interrupted
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
        if (res.ok) {
          const remoteRoom: RoomState = await res.json();
          setRoom((current) => {
            const currentSeedsStr = current.scannedSeeds.map(Number).sort((a, b) => a - b).join(',');
            const remoteSeedsStr = (remoteRoom.scannedSeeds || []).map(Number).sort((a, b) => a - b).join(',');
            const seedsChanged = currentSeedsStr !== remoteSeedsStr;
            const stageChanged = current.stage !== remoteRoom.stage;
            const configChanged =
              current.totalSeeds !== remoteRoom.totalSeeds ||
              current.customBgUrl !== remoteRoom.customBgUrl ||
              current.endingImageUrl !== remoteRoom.endingImageUrl ||
              current.bgPreset !== remoteRoom.bgPreset;
            const timeAdvanced = remoteRoom.lastUpdated > current.lastUpdated;

            if (seedsChanged || stageChanged || configChanged || timeAdvanced) {
              const updatedRoom: RoomState = {
                ...remoteRoom,
                scannedSeeds: Array.from(new Set((remoteRoom.scannedSeeds || []).map(Number))).sort((a, b) => a - b),
              };
              saveRoomToCache(updatedRoom as CachedRoomData);
              return updatedRoom;
            }
            return current;
          });
        }
      } catch {
        // ignore offline
      }
    }, 1200);

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, role, updateAndCacheRoom]);

  // Actions
  const sendScan = useCallback(
    (seedNumber: number) => {
      const num = parseInt(String(seedNumber), 10);
      if (isNaN(num)) return;

      // 1. Instant optimistic update
      let nextRoomState: RoomState | null = null;
      setRoom((prev) => {
        const prevSeeds = prev.scannedSeeds.map(Number);
        if (prevSeeds.includes(num)) return prev;
        const nextSeeds = Array.from(new Set([...prevSeeds, num])).sort((a, b) => a - b);
        const nextStage = nextSeeds.length >= prev.totalSeeds && prev.stage === 'accumulating' ? 'ready_to_blow' : prev.stage;
        const nextRoom: RoomState = { ...prev, scannedSeeds: nextSeeds, stage: nextStage, lastUpdated: Date.now() };
        nextRoomState = nextRoom;
        saveRoomToCache(nextRoom as CachedRoomData);
        return nextRoom;
      });

      // 2. BroadcastChannel for instant same-browser cross-tab sync
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'scan_result',
            seedNumber: num,
            isNew: true,
            room: nextRoomState,
          });
        } catch {
          // ignore
        }
      }

      // 3. WebSocket send
      const msg = { type: 'scan', roomId, seedNumber: num };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(msg));
        } catch {
          // fallback
        }
      }

      // 4. Guaranteed HTTP POST (ensures remote server persistence across devices)
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedNumber: num }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.room) {
            updateAndCacheRoom(data.room);
          }
        })
        .catch(console.error);
    },
    [roomId, updateAndCacheRoom]
  );

  const forceScanNext = useCallback(
    (seedNumber?: number) => {
      const num = seedNumber != null ? parseInt(String(seedNumber), 10) : undefined;

      // 1. Instant optimistic update
      let nextRoomState: RoomState | null = null;
      setRoom((prev) => {
        const prevSeeds = prev.scannedSeeds.map(Number);
        let nextSeeds: number[];

        if (num != null && !isNaN(num)) {
          // Toggle seed if specific number passed
          if (prevSeeds.includes(num)) {
            nextSeeds = prevSeeds.filter((s) => s !== num);
          } else {
            nextSeeds = [...prevSeeds, num];
          }
        } else {
          // Pick lowest unlit seed
          let target: number | null = null;
          for (let i = 1; i <= prev.totalSeeds; i++) {
            if (!prevSeeds.includes(i)) {
              target = i;
              break;
            }
          }
          if (target == null) return prev; // All already lit
          nextSeeds = [...prevSeeds, target];
        }

        nextSeeds = Array.from(new Set(nextSeeds)).sort((a, b) => a - b);
        let nextStage = prev.stage;
        if (nextSeeds.length >= prev.totalSeeds && prev.stage === 'accumulating') {
          nextStage = 'ready_to_blow';
        } else if (nextSeeds.length < prev.totalSeeds && prev.stage === 'ready_to_blow') {
          nextStage = 'accumulating';
        }

        const nextRoom: RoomState = { ...prev, scannedSeeds: nextSeeds, stage: nextStage, lastUpdated: Date.now() };
        nextRoomState = nextRoom;
        saveRoomToCache(nextRoom as CachedRoomData);
        return nextRoom;
      });

      // 2. BroadcastChannel instant sync
      if (broadcastChannelRef.current && nextRoomState) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'sync',
            room: nextRoomState,
          });
        } catch {
          // ignore
        }
      }

      // 3. Send through exactly one transport.
      // force_scan is a toggle, so sending both WS and REST would turn it on and
      // immediately off again.
      const msg = { type: 'force_scan', roomId, seedNumber: num };
      let sentViaWebSocket = false;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(msg));
          sentViaWebSocket = true;
        } catch {
          // fallback
        }
      }

      // 4. REST is used only when WebSocket is unavailable.
      if (!sentViaWebSocket) {
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'force_scan', seedNumber: num }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.room) {
              updateAndCacheRoom(data.room);
            }
          })
          .catch(console.error);
      }
    },
    [roomId, updateAndCacheRoom]
  );

  const startBlow = useCallback(() => {
    // Optimistic local transition keeps the activity working on static hosts
    // such as Vercel, where the Express WebSocket server is not available.
    setRoom((prev) => {
      const nextRoom: RoomState = {
        ...prev,
        stage: 'blowing',
        lastUpdated: Date.now(),
      };
      saveRoomToCache(nextRoom as CachedRoomData);
      broadcastChannelRef.current?.postMessage({ type: 'sync', room: nextRoom });
      return nextRoom;
    });

    const msg = { type: 'start_blow', roomId };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'blow' }),
      }).catch(console.error);
    }
  }, [roomId]);

  const setStage = useCallback(
    (stage: StageType) => {
      setRoom((prev) => {
        const nextRoom: RoomState = {
          ...prev,
          stage,
          lastUpdated: Date.now(),
        };
        saveRoomToCache(nextRoom as CachedRoomData);
        broadcastChannelRef.current?.postMessage({ type: 'sync', room: nextRoom });
        return nextRoom;
      });

      const msg = { type: 'set_stage', roomId, stage };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      } else {
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_stage', stage }),
        }).catch(console.error);
      }
    },
    [roomId]
  );

  const resetRoom = useCallback(() => {
    setRoom((prev) => {
      const nextRoom: RoomState = {
        ...prev,
        scannedSeeds: [],
        stage: 'accumulating',
        lastUpdated: Date.now(),
      };
      saveRoomToCache(nextRoom as CachedRoomData);
      broadcastChannelRef.current?.postMessage({ type: 'sync', room: nextRoom });
      return nextRoom;
    });

    const msg = { type: 'reset', roomId };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      }).catch(console.error);
    }
  }, [roomId]);

  const updateConfig = useCallback(
    (config: { totalSeeds?: number; bgPreset?: string; customBgUrl?: string | null; endingImageUrl?: string | null; bgDim?: number }) => {
      setRoom((prev) => {
        const nextRoom: RoomState = {
          ...prev,
          ...config,
          lastUpdated: Date.now(),
        };
        saveRoomToCache(nextRoom as CachedRoomData);
        broadcastChannelRef.current?.postMessage({ type: 'sync', room: nextRoom });
        return nextRoom;
      });

      const msg = { type: 'update_config', roomId, ...config };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      } else {
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_config', ...config }),
        }).catch(console.error);
      }
    },
    [roomId]
  );

  return {
    room,
    connected,
    lastScannedSeed,
    sendScan,
    forceScanNext,
    startBlow,
    setStage,
    resetRoom,
    updateConfig,
  };
}
