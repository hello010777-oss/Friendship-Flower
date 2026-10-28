import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Sparkles, Volume2, ArrowLeft, RefreshCw, Zap } from 'lucide-react';
import { TigerHead } from './Characters';
import { playChimeSound, speakFriendlyGuide } from '../services/audio';
import confetti from 'canvas-confetti';
import type { RoomState } from '../services/roomClient';

interface ScannerViewProps {
  room: RoomState;
  onScan: (seedNumber: number) => void;
  onBackToDisplay: () => void;
  lastScannedResult?: {
    seedNumber: number;
    isNew: boolean;
    timestamp: number;
  } | null;
}

export function ScannerView({
  room,
  onScan,
  onBackToDisplay,
  lastScannedResult,
}: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCooldown, setIsCooldown] = useState(false);
  const [feedbackOverlay, setFeedbackOverlay] = useState<{
    type: 'success' | 'duplicate';
    seedNumber: number;
  } | null>(null);

  // Start Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isActive = true;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported in this browser');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setHasCamera(true);
          setCameraError(null);
        }
      } catch (err: unknown) {
        console.warn('Camera stream error:', err);
        if (isActive) {
          setHasCamera(false);
          setCameraError('카메라를 열 수 없습니다. 아래 번호 버튼으로 테스트할 수 있습니다.');
        }
      }
    }

    initCamera();

    return () => {
      isActive = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Robust Scan Detection
  const handleDetectedCode = (rawText: string) => {
    if (isCooldown || !rawText) return;

    let parsedSeed: number | null = null;
    const str = rawText.trim();

    try {
      if (str.startsWith('{') && str.endsWith('}')) {
        const obj = JSON.parse(str);
        if (obj.seed != null) {
          const n = parseInt(String(obj.seed), 10);
          if (!isNaN(n)) parsedSeed = n;
        }
      }
    } catch {
      // not JSON
    }

    if (!parsedSeed) {
      const seedMatch = str.match(/SEED[_\s-]*0*([0-9]+)/i);
      if (seedMatch) {
        parsedSeed = parseInt(seedMatch[1], 10);
      } else {
        const urlMatch = str.match(/[?&]seed=([0-9]+)/i);
        if (urlMatch) {
          parsedSeed = parseInt(urlMatch[1], 10);
        } else if (/^[0-9]+$/.test(str)) {
          parsedSeed = parseInt(str, 10);
        }
      }
    }

    if (parsedSeed && !isNaN(parsedSeed) && parsedSeed >= 1 && parsedSeed <= room.totalSeeds) {
      processSeedScan(parsedSeed);
    }
  };

  const processSeedScan = (seedNumInput: number) => {
    if (isCooldown) return;
    const seedNum = parseInt(String(seedNumInput), 10);
    if (isNaN(seedNum) || seedNum < 1 || seedNum > room.totalSeeds) return;

    setIsCooldown(true);

    const alreadyLit = room.scannedSeeds.map(Number).includes(seedNum);

    if (!alreadyLit) {
      // 1. New Seed
      setFeedbackOverlay({ type: 'success', seedNumber: seedNum });
      try {
        playChimeSound(1.15);
      } catch {}
      try {
        speakFriendlyGuide(`홀씨에 불이 켜졌어요! ${seedNum}번 홀씨가 반짝여요.`);
      } catch {}

      onScan(seedNum);
    } else {
      // 2. Duplicate Seed (gentle positive encouragement)
      setFeedbackOverlay({ type: 'duplicate', seedNumber: seedNum });
      try {
        playChimeSound(0.9);
      } catch {}
      try {
        speakFriendlyGuide('이미 불이 켜진 홀씨예요! 아직 안 켜진 다른 홀씨를 찾아볼까요?');
      } catch {}
    }

    // Auto reset cooldown after 1.2 seconds for the next scan
    window.setTimeout(() => {
      setFeedbackOverlay(null);
      setIsCooldown(false);
    }, 1200);
  };

  // Continuous frame scanning loop using jsQR
  useEffect(() => {
    let active = true;

    function tick() {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !isCooldown) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleDetectedCode(code.data);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCooldown, room.totalSeeds, room.scannedSeeds]);

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Hidden canvas for video processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Video Viewfinder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Viewfinder Overlay Dark Vignette */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Reticle / Target Box */}
        <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-3xl border-4 border-amber-400 shadow-[0_0_30px_rgba(255,210,63,0.6)] flex items-center justify-center pointer-events-none animate-[pulse_3s_infinite]">
          {/* Corner brackets */}
          <div className="absolute -top-3 -left-3 w-8 h-8 border-t-6 border-l-6 border-white rounded-tl-xl" />
          <div className="absolute -top-3 -right-3 w-8 h-8 border-t-6 border-r-6 border-white rounded-tr-xl" />
          <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-6 border-l-6 border-white rounded-bl-xl" />
          <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-6 border-r-6 border-white rounded-br-xl" />

          {/* Center aiming reticle */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/60 animate-spin" />
        </div>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-20 w-full p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onBackToDisplay}
          className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm cursor-pointer shadow"
        >
          <ArrowLeft className="w-4 h-4" /> 대형 화면 보기
        </button>

        {/* Classroom Info & Progress */}
        <div className="bg-amber-400/90 text-amber-950 px-5 py-2 rounded-2xl font-black text-base shadow flex items-center gap-2">
          <span>🌻 {room.roomId}</span>
          <span className="text-amber-800">|</span>
          <span>
            {room.scannedSeeds.length} / {room.totalSeeds} 켜짐
          </span>
        </div>

        {/* Camera Switch button */}
        <button
          onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
          className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer shadow backdrop-blur-md"
          title="카메라 전환"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Center Camera Fallback Message (If camera is blocked/denied) */}
      {hasCamera === false && (
        <div className="relative z-20 bg-amber-950/90 border-2 border-amber-400 text-white p-6 rounded-3xl max-w-md mx-4 text-center space-y-3 backdrop-blur-md shadow-2xl">
          <Camera className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="font-bold text-lg">카메라 연결 안내</h3>
          <p className="text-xs text-amber-200">{cameraError}</p>
          <p className="text-xs text-amber-300 font-semibold">
            아래의 번호 버튼을 직접 눌러서 홀씨 카드를 대신 찍어볼 수 있습니다!
          </p>
        </div>
      )}

      {/* SUCCESS OVERLAY (노란 별빛 팡 터짐 + "홀씨에 불이 켜졌어요!") */}
      {feedbackOverlay?.type === 'success' && (
        <div className="absolute inset-0 z-30 bg-amber-400/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-[zoomIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center mb-4 animate-[bounce_1s_infinite]">
            <Sparkles className="w-16 h-16 text-amber-500" />
          </div>
          <div className="bg-white/95 px-8 py-5 rounded-3xl shadow-2xl border-4 border-amber-300 max-w-sm space-y-2">
            <span className="text-3xl font-black text-amber-600 block">
              #{feedbackOverlay.seedNumber}번 홀씨
            </span>
            <h2 className="text-2xl font-black text-slate-800">
              홀씨에 불이 켜졌어요! ✨
            </h2>
            <p className="text-xs font-bold text-amber-700">
              대형 화면 속 민들레가 환하게 빛나요!
            </p>
          </div>
          <p className="mt-6 text-sm font-bold text-amber-950 bg-white/70 px-4 py-1.5 rounded-full">
            잠시 후 다음 친구 차례가 시작돼요
          </p>
        </div>
      )}

      {/* DUPLICATE OVERLAY (이미 켜진 홀씨 - 부드러운 호랑이 안내) */}
      {feedbackOverlay?.type === 'duplicate' && (
        <div className="absolute inset-0 z-30 bg-orange-400/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-[zoomIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center mb-4">
            <TigerHead className="w-24 h-24" emotion="happy" />
          </div>
          <div className="bg-white/95 px-8 py-5 rounded-3xl shadow-2xl border-4 border-orange-300 max-w-sm space-y-2">
            <span className="text-2xl font-black text-orange-600 block">
              #{feedbackOverlay.seedNumber}번 홀씨
            </span>
            <h2 className="text-xl font-black text-slate-800">
              이미 불이 켜진 홀씨예요! 😊
            </h2>
            <p className="text-sm font-bold text-orange-700">
              아직 안 켜진 다른 홀씨 카드를 찾아볼까요?
            </p>
          </div>
          <p className="mt-6 text-sm font-bold text-orange-950 bg-white/70 px-4 py-1.5 rounded-full">
            잠시 후 다음 친구 차례가 시작돼요
          </p>
        </div>
      )}

      {/* Bottom Floating Control & Manual Simulation Bar */}
      <div className="relative z-20 w-full p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center gap-3">
        {/* Helper prompt banner */}
        <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-amber-300 flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
          <span>📷</span>
          <span>카메라 사각틀 중앙에 QR 카드를 비춰주세요!</span>
        </div>

        {/* Simulation Keypad (Allows immediate testing without printing physical cards) */}
        <div className="w-full max-w-lg bg-black/60 backdrop-blur-md p-2.5 rounded-2xl border border-white/20">
          <div className="flex items-center justify-between px-2 mb-1.5 text-white/80 text-xs">
            <span className="font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> 빠른 테스트 키패드 (카드 번호 직접 터치)
            </span>
            <span className="text-[11px] text-amber-300 font-mono">
              남은 홀씨: {room.totalSeeds - room.scannedSeeds.length}개
            </span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {Array.from({ length: room.totalSeeds }).map((_, idx) => {
              const seedNum = idx + 1;
              const isLit = room.scannedSeeds.includes(seedNum);
              return (
                <button
                  key={seedNum}
                  onClick={() => processSeedScan(seedNum)}
                  className={`min-w-10 h-10 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow ${
                    isLit
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  {seedNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
