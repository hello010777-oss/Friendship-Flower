/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useRoomSync, type StageType } from './services/roomClient';
import { loadCustomBackgroundFromCache, loadEndingImageFromCache } from './services/storage';
import { BackgroundView } from './components/BackgroundView';
import { DisplayView } from './components/DisplayView';
import { ScannerView } from './components/ScannerView';

export default function App() {
  // Parse mode & room from URL parameters
  const [mode, setMode] = useState<'display' | 'scanner'>(() => {
    if (typeof window === 'undefined') return 'display';
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'scanner') return m;
    return 'display';
  });

  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window === 'undefined') return '우정반';
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room') || '우정반';
    try {
      return decodeURIComponent(r).trim() || '우정반';
    } catch {
      return r.trim() || '우정반';
    }
  });

  // Real-time synchronization hook for the current room
  const {
    room,
    connected,
    lastScannedSeed,
    sendScan,
    forceScanNext,
    startBlow,
    setStage,
    resetRoom,
    updateConfig,
  } = useRoomSync(roomId, mode === 'scanner' ? 'scanner' : 'display');

  // Sync URL query params with state changes
  const switchMode = (newMode: 'display' | 'scanner') => {
    setMode(newMode);
    const params = new URLSearchParams(window.location.search);
    params.set('mode', newMode);
    params.set('room', roomId);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Restore custom background and custom ending image from IndexedDB cache
  useEffect(() => {
    if (!room.customBgUrl) {
      loadCustomBackgroundFromCache(`bg_${roomId}`).then((cachedBg) => {
        if (cachedBg) {
          updateConfig({ customBgUrl: cachedBg });
        }
      });
    }
    if (!room.endingImageUrl) {
      loadEndingImageFromCache(roomId).then((cachedEnding) => {
        if (cachedEnding) {
          updateConfig({ endingImageUrl: cachedEnding });
        }
      });
    }
  }, [roomId, room.customBgUrl, room.endingImageUrl, updateConfig]);

  // Tablet Scanner View
  if (mode === 'scanner') {
    return (
      <ScannerView
        room={room}
        onScan={sendScan}
        onBackToDisplay={() => switchMode('display')}
        lastScannedResult={lastScannedSeed}
      />
    );
  }

  // Main Classroom Large Display View
  return (
    <BackgroundView
      customBgUrl={room.customBgUrl}
      bgPreset={room.bgPreset}
      stage={room.stage}
      bgDim={room.bgDim}
    >
      <DisplayView
        room={room}
        connected={connected}
        lastScannedResult={lastScannedSeed}
        onForceScan={forceScanNext}
        onStartBlow={startBlow}
        onSetStage={setStage}
        onReset={resetRoom}
        onUpdateConfig={updateConfig}
        onSwitchMode={switchMode}
      />
    </BackgroundView>
  );
}
