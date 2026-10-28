import React, { useEffect, useState, useRef } from 'react';
import {
  Maximize,
  Minimize,
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  Sprout,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { DandelionHead } from './DandelionHead';
import { TeacherAdminModal } from './TeacherAdminModal';
import {
  playChimeSound,
  playCompleteFanfare,
  playWindSound,
  playBloomSound,
  speakFriendlyGuide,
} from '../services/audio';
import confetti from 'canvas-confetti';
import type { RoomState, StageType } from '../services/roomClient';

interface DisplayViewProps {
  room: RoomState;
  connected: boolean;
  lastScannedResult?: {
    seedNumber: number;
    isNew: boolean;
    timestamp: number;
  } | null;
  onForceScan: (seedNumber?: number) => void;
  onStartBlow: () => void;
  onSetStage: (stage: StageType) => void;
  onReset: () => void;
  onUpdateConfig: (config: {
    totalSeeds?: number;
    bgPreset?: string;
    customBgUrl?: string | null;
    endingImageUrl?: string | null;
    bgDim?: number;
  }) => void;
  onSwitchMode: (mode: 'display' | 'scanner') => void;
}

export function DisplayView({
  room,
  connected,
  lastScannedResult,
  onForceScan,
  onStartBlow,
  onSetStage,
  onReset,
  onUpdateConfig,
  onSwitchMode,
}: DisplayViewProps) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recentLitSeed, setRecentLitSeed] = useState<number | null>(null);
  const [seedNumberInput, setSeedNumberInput] = useState('');
  const [isNumberManagerOpen, setIsNumberManagerOpen] = useState(false);
  const [editingSeedNumber, setEditingSeedNumber] = useState<number | null>(null);
  const [editNumberInput, setEditNumberInput] = useState('');
  const [seedNumbers, setSeedNumbers] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`dandelion_numbers_${room.roomId}`);
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(parsed.map(Number).filter((number) => Number.isInteger(number) && number > 0))
        ).sort((a, b) => a - b);
      }
    } catch {
      // Start with no number buttons when saved data is unavailable.
    }
    return [];
  });

  const prevScannedCountRef = useRef(room.scannedSeeds.length);
  const prevStageRef = useRef(room.stage);

  // Keep number buttons identical across every open display tab.
  useEffect(() => {
    const storageKey = `dandelion_numbers_${room.roomId}`;
    const syncSavedNumbers = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(parsed)) return;
        const nextNumbers = Array.from(
          new Set(parsed.map(Number).filter((number) => Number.isInteger(number) && number > 0))
        ).sort((a, b) => a - b);
        setSeedNumbers(nextNumbers);
      } catch {
        // Keep the current buttons if saved data cannot be parsed.
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) syncSavedNumbers();
    };

    syncSavedNumbers();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [room.roomId]);

  // Keep the shared room total aligned with the number buttons that were made.
  useEffect(() => {
    if (room.totalSeeds !== seedNumbers.length) {
      onUpdateConfig({ totalSeeds: seedNumbers.length });
    }
  }, [seedNumbers.length, room.totalSeeds, onUpdateConfig]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts Handler (Space, ↑, R, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (room.stage === 'ready_to_blow' || room.stage === 'accumulating') {
          handleExecuteBlow();
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        onForceScan();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReplay();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        setIsAdminOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [room.stage]);

  // Watch for scan count increases and trigger gentle chime sound
  useEffect(() => {
    if (room.scannedSeeds.length > prevScannedCountRef.current) {
      const latestSeed = room.scannedSeeds[room.scannedSeeds.length - 1];
      setRecentLitSeed(latestSeed);
      if (!isMuted) {
        playChimeSound(1.0 + (room.scannedSeeds.length / room.totalSeeds) * 0.4);
      }

      const timer = setTimeout(() => setRecentLitSeed(null), 1200);
      return () => clearTimeout(timer);
    }
    prevScannedCountRef.current = room.scannedSeeds.length;
  }, [room.scannedSeeds, room.totalSeeds, isMuted]);

  // Watch for completion -> transition to ready_to_blow (no flash screen)
  useEffect(() => {
    if (room.scannedSeeds.length >= room.totalSeeds && prevStageRef.current === 'accumulating') {
      if (!isMuted) {
        playCompleteFanfare();
        speakFriendlyGuide('모든 홀씨를 다 모았어요! 다 함께 후~ 불어볼까요?');
      }
    }
    prevStageRef.current = room.stage;
  }, [room.scannedSeeds.length, room.totalSeeds, room.stage, isMuted]);

  // Animation Timeline Controller
  useEffect(() => {
    let timer1: number | null = null;

    if (room.stage === 'blowing') {
      if (!isMuted) {
        playWindSound(3.2);
      }

      // After 3.0 seconds -> transition to blooming
      timer1 = window.setTimeout(() => {
        onSetStage('blooming');
      }, 3000);
    } else if (room.stage === 'blooming') {
      if (!isMuted) {
        playBloomSound();
      }

      // Celebratory flower confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.45 },
          colors: ['#FFD23F', '#FFFFFF', '#52B788', '#FF708F', '#FFF3B0'],
        });
      } catch {
        // ignore
      }
    }

    return () => {
      if (timer1) clearTimeout(timer1);
    };
  }, [room.stage, isMuted]);

  // Execute Blow Action
  const handleExecuteBlow = () => {
    onStartBlow();
  };

  // Replay blooming sequence
  const handleReplay = () => {
    onSetStage('ready_to_blow');
  };

  const enteredSeedNumber = Number(seedNumberInput);
  const isValidSeedNumber =
    Number.isInteger(enteredSeedNumber) &&
    enteredSeedNumber >= 1 &&
    enteredSeedNumber <= 99;
  const isNumberAlreadyCreated =
    isValidSeedNumber && seedNumbers.includes(enteredSeedNumber);
  const visibleScannedSeeds = room.scannedSeeds
    .map(Number)
    .filter((number) => seedNumbers.includes(number));
  const createdSeedCount = seedNumbers.length;
  const collectedSeedCount = visibleScannedSeeds.length;

  const saveSeedNumbers = (nextNumbers: number[]) => {
    const sortedNumbers = [...nextNumbers].sort((a, b) => a - b);
    setSeedNumbers(sortedNumbers);
    localStorage.setItem(
      `dandelion_numbers_${room.roomId}`,
      JSON.stringify(sortedNumbers)
    );
    onUpdateConfig({ totalSeeds: sortedNumbers.length });
  };

  const handleCreateNumber = () => {
    if (!isValidSeedNumber || isNumberAlreadyCreated || seedNumbers.length >= 40) return;
    saveSeedNumbers([...seedNumbers, enteredSeedNumber]);
    setSeedNumberInput('');
  };

  const handleDeleteNumber = (seedNumber: number) => {
    if (visibleScannedSeeds.includes(seedNumber)) {
      onForceScan(seedNumber);
    }
    saveSeedNumbers(seedNumbers.filter((number) => number !== seedNumber));
    if (editingSeedNumber === seedNumber) {
      setEditingSeedNumber(null);
      setEditNumberInput('');
    }
  };

  const handleStartEditingNumber = (seedNumber: number) => {
    setEditingSeedNumber(seedNumber);
    setEditNumberInput(String(seedNumber));
  };

  const handleSaveEditedNumber = () => {
    if (editingSeedNumber == null) return;
    const nextNumber = Number(editNumberInput);
    const isValid =
      Number.isInteger(nextNumber) &&
      nextNumber >= 1 &&
      nextNumber <= 99 &&
      (nextNumber === editingSeedNumber || !seedNumbers.includes(nextNumber));
    if (!isValid) return;

    if (nextNumber !== editingSeedNumber) {
      if (visibleScannedSeeds.includes(editingSeedNumber)) {
        onForceScan(editingSeedNumber);
      }
      saveSeedNumbers(
        seedNumbers.map((number) => number === editingSeedNumber ? nextNumber : number)
      );
    }
    setEditingSeedNumber(null);
    setEditNumberInput('');
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-8 select-none">

      {/* TOP HEADER BAR (우정반 배지 제거 완료, 깔끔한 미니멀 컨트롤 유지) */}
      <header className="w-full flex items-center justify-between z-30">
        {/* Left: Clean Subtle State Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-white/50 text-xs font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {room.stage === 'accumulating' && '번호 버튼을 눌러 홀씨를 모아보세요'}
              {room.stage === 'ready_to_blow' && '다 모았어요! 다 함께 "후~" 불어보세요'}
              {room.stage === 'blowing' && '홀씨가 바람에 날아가고 있어요'}
              {(room.stage === 'blooming' || room.stage === 'ending') && '노란 민들레꽃이 피어났어요!'}
            </span>
          </div>
        </div>

        {/* Right: Controls (Sound, Fullscreen, Teacher Settings) */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-11 h-11 rounded-2xl bg-white/80 hover:bg-white text-slate-700 shadow-md border border-white/50 flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title={isMuted ? '소리 켜기' : '소리 끄기'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-amber-600" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-11 h-11 rounded-2xl bg-white/80 hover:bg-white text-slate-700 shadow-md border border-white/50 flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title="전체화면"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Teacher Admin Modal Button */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="h-11 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>선생님 메뉴</span>
          </button>
        </div>
      </header>

      {/* CENTER STAGE */}
      <main className="relative flex-1 flex items-center justify-center z-20 my-auto w-full">
        <div className="relative w-full flex items-center justify-center">
          <DandelionHead
            seedNumbers={seedNumbers}
            scannedSeeds={visibleScannedSeeds}
            stage={room.stage}
            lastScannedNumber={recentLitSeed}
            onBlowTrigger={handleExecuteBlow}
            onReturnToStart={() => {
              setRecentLitSeed(null);
              onReset();
            }}
          />
        </div>

        {/* Playful number buttons floating in the background around the flower */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {(room.stage === 'accumulating' || room.stage === 'ready_to_blow') && seedNumbers.map((seedNumber, index) => {
            const angle =
              (Math.PI * 2 * index) / Math.max(seedNumbers.length, 1) -
              Math.PI / 2 +
              (seedNumbers.length > 1 ? Math.PI / seedNumbers.length : 0);
            const left = 50 + Math.cos(angle) * 43;
            const top = 50 + Math.sin(angle) * 34;
            const isVisible = visibleScannedSeeds.includes(seedNumber);
            if (isVisible) return null;
            const colors = [
              ['#ff8fab', '#c9184a'],
              ['#ffd166', '#b66a00'],
              ['#70d6ff', '#087ea4'],
              ['#b8f2a1', '#287a3e'],
              ['#cdb4ff', '#6741a5'],
              ['#ffad69', '#a94d00'],
            ];
            const [backgroundColor, textColor] = colors[index % colors.length];

            return (
              <div
                key={seedNumber}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <button
                  onClick={() => {
                    onForceScan(seedNumber);
                  }}
                  aria-label={`${seedNumber}번 홀씨 만들기`}
                  className="number-button-float w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-4 border-white text-2xl sm:text-3xl font-black shadow-[0_8px_0_rgba(66,42,20,.2),0_12px_25px_rgba(0,0,0,.22)] transition-all hover:scale-110 active:translate-y-1 active:shadow-md cursor-pointer"
                  style={{
                    backgroundColor,
                    color: textColor,
                    animationDelay: `${index * -0.23}s`,
                  }}
                >
                  {seedNumber}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* BOTTOM FOOTER: PROGRESS COUNTER & NAVIGATION */}
      <footer className="w-full grid grid-cols-[1fr_auto_1fr] items-end gap-4 z-30 pointer-events-none">
        {/* Left: Quick Tablet Connect & Print Shortcuts */}
        <div />

        {/* Center: create buttons that will appear in the background */}
        <div className="relative pointer-events-auto bg-white/95 backdrop-blur-md px-4 py-3 rounded-3xl shadow-2xl border-4 border-amber-300">
          <form
            className="flex items-center justify-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateNumber();
            }}
          >
            <label htmlFor="seed-number-input" className="text-xs font-black text-amber-900 whitespace-nowrap">
              번호 만들기
            </label>
            <input
              id="seed-number-input"
              type="number"
              min={1}
              max={99}
              value={seedNumberInput}
              onChange={(event) => setSeedNumberInput(event.target.value)}
              placeholder="번호"
              className="w-20 h-9 rounded-xl border-2 border-amber-200 bg-amber-50 px-2 text-center text-base font-black text-slate-800 outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!isValidSeedNumber || isNumberAlreadyCreated || seedNumbers.length >= 40}
              className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs shadow flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              번호 추가
            </button>
            <button
              type="button"
              onClick={() => setIsNumberManagerOpen((open) => !open)}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs border border-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              번호 관리
            </button>
          </form>

          {isNumberManagerOpen && (
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 max-h-64 overflow-y-auto bg-white rounded-3xl border-4 border-amber-300 shadow-2xl p-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-black text-sm text-amber-900">만든 번호 수정·삭제</span>
                <button
                  onClick={() => setIsNumberManagerOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                  aria-label="번호 관리 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {seedNumbers.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-5">만든 번호가 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {seedNumbers.map((seedNumber) => (
                    <div
                      key={seedNumber}
                      className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-2"
                    >
                      {editingSeedNumber === seedNumber ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={editNumberInput}
                            onChange={(event) => setEditNumberInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') handleSaveEditedNumber();
                            }}
                            className="w-20 h-8 rounded-lg border-2 border-amber-300 text-center font-black outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditedNumber}
                            className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center cursor-pointer"
                            aria-label={`${seedNumber}번 수정 저장`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSeedNumber(null)}
                            className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                            aria-label="수정 취소"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-black text-amber-900 pl-2">
                            {seedNumber}번
                            {visibleScannedSeeds.includes(seedNumber) && (
                              <span className="ml-2 text-xs text-emerald-600">홀씨 생성됨</span>
                            )}
                          </span>
                          <button
                            onClick={() => handleStartEditingNumber(seedNumber)}
                            className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center cursor-pointer"
                            aria-label={`${seedNumber}번 수정`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNumber(seedNumber)}
                            className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center cursor-pointer"
                            aria-label={`${seedNumber}번 삭제`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sprout Progress Badge */}
        <div className="pointer-events-auto justify-self-end bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-2xl border-4 border-amber-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Sprout className="w-7 h-7 text-emerald-600 animate-[bounce_2s_infinite]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                모은 홀씨 조각
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
                  {collectedSeedCount}
                </span>
                <span className="text-sm font-bold text-slate-400">/</span>
                <span className="text-lg font-bold text-slate-600 font-mono">
                  {createdSeedCount}
                </span>
                <span className="text-xs font-bold text-emerald-700 ml-1">
                  ({createdSeedCount > 0 ? Math.round((collectedSeedCount / createdSeedCount) * 100) : 0}%)
                </span>
              </div>
            </div>
        </div>
      </footer>

      {/* Teacher Admin Modal */}
      <TeacherAdminModal
        room={room}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onUpdateConfig={onUpdateConfig}
        onForceScan={onForceScan}
        onStartBlow={handleExecuteBlow}
        onReset={onReset}
        onReplay={handleReplay}
        onSwitchMode={onSwitchMode}
      />
    </div>
  );
}
