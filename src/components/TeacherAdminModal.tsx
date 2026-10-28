import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Upload,
  RotateCcw,
  Sparkles,
  Wind,
  QrCode,
  X,
  CheckCircle2,
  Image as ImageIcon,
  HelpCircle,
  Download,
  Copy,
  Check,
  FileCode,
  Terminal,
} from 'lucide-react';
import { saveCustomBackgroundToCache } from '../services/storage';
import type { RoomState } from '../services/roomClient';

interface TeacherAdminModalProps {
  room: RoomState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConfig: (config: { totalSeeds?: number; bgPreset?: string; customBgUrl?: string | null; endingImageUrl?: string | null; bgDim?: number }) => void;
  onForceScan: (seedNumber?: number) => void;
  onStartBlow: () => void;
  onReset: () => void;
  onReplay: () => void;
  onSwitchMode: (mode: 'display' | 'scanner') => void;
}

interface ProjectFile {
  path: string;
  content: string;
}

export function TeacherAdminModal({
  room,
  isOpen,
  onClose,
  onUpdateConfig,
  onForceScan,
  onStartBlow,
  onReset,
  onReplay,
  onSwitchMode,
}: TeacherAdminModalProps) {
  const [scannerQrUrl, setScannerQrUrl] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'seeds' | 'background' | 'connect' | 'code'>('control');

  // Code tab state
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Generate QR code for tablet scanner URL
  useEffect(() => {
    const scannerUrl = `${window.location.origin}/?mode=scanner&room=${encodeURIComponent(room.roomId)}`;
    QRCode.toDataURL(scannerUrl, { width: 220, margin: 1 })
      .then(setScannerQrUrl)
      .catch(console.error);
  }, [room.roomId]);

  // Load project files when code tab is opened
  useEffect(() => {
    if (activeTab === 'code' && projectFiles.length === 0) {
      setIsLoadingFiles(true);
      fetch('/api/project/files')
        .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch files')))
        .then((data) => {
          if (data && Array.isArray(data.files)) {
            setProjectFiles(data.files);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingFiles(false));
    }
  }, [activeTab, projectFiles.length]);

  if (!isOpen) return null;

  // Handle custom background image upload
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        await saveCustomBackgroundToCache(`bg_${room.roomId}`, base64);
        onUpdateConfig({ customBgUrl: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Copy single file content
  const handleCopyFile = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 2000);
    });
  };

  // Copy all project files combined
  const handleCopyAllFiles = () => {
    if (projectFiles.length === 0) return;
    const combined = projectFiles
      .map((f) => `// ================================\n// File: ${f.path}\n// ================================\n\n${f.content}\n`)
      .join('\n\n');
    navigator.clipboard.writeText(combined).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  // Trigger ZIP download
  const handleDownloadZip = () => {
    window.location.href = '/api/project/download-zip';
  };

  const currentFile = projectFiles[selectedFileIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              🌻
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">교사용 컨트롤러 & 환경설정</h2>
              <p className="text-xs text-amber-100">
                교실 방 이름: <span className="font-semibold underline">{room.roomId}</span> | 현재 점등:{' '}
                {room.scannedSeeds.length} / {room.totalSeeds}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-amber-100 bg-amber-50/60 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('control')}
            className={`pb-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'control'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🎮 빠른 조작
          </button>
          <button
            onClick={() => setActiveTab('seeds')}
            className={`pb-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'seeds'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ✨ 번호 현황
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`pb-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'background'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🖼️ 배경 설정
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'connect'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📱 태블릿 연결
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💻 전체 코드 다운로드
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* TAB 1: QUICK CONTROL */}
          {activeTab === 'control' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => {
                    onStartBlow();
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Wind className="w-8 h-8 text-emerald-600" />
                  <span className="font-bold text-base">‘후~’ 불기 시작</span>
                  <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono">
                    Space Bar
                  </span>
                </button>

                <button
                  onClick={() => onForceScan()}
                  className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Sparkles className="w-8 h-8 text-amber-600" />
                  <span className="font-bold text-base">다음 홀씨 강제 점등</span>
                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono">
                    ↑ 화살표키
                  </span>
                </button>

                <button
                  onClick={() => {
                    onReplay();
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 text-blue-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <RotateCcw className="w-8 h-8 text-blue-600" />
                  <span className="font-bold text-base">개화 애니메이션 다시보기</span>
                  <span className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-mono">
                    R 키
                  </span>
                </button>

                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <RotateCcw className="w-8 h-8 text-rose-600" />
                  <span className="font-bold text-base">새 놀이 시작 (초기화)</span>
                  <span className="text-xs bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-mono">
                    Esc 키
                  </span>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm mb-2">
                  <HelpCircle className="w-4 h-4 text-amber-500" /> 대형 화면 PC 직접 제어 단축키 안내
                </div>
                <p>• <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Space Bar</kbd> : 아이들과 함께 후~ 불기 시작</p>
                <p>• <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">↑ Arrow</kbd> : 카드를 못 찾은 친구를 위해 다음 미점등 조각 불 켜기</p>
                <p>• <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">R</kbd> : 개화 다시 감상하기</p>
                <p>• <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Esc</kbd> : 다음 반 수업을 위해 홀씨 상태 초기화</p>
              </div>
            </div>
          )}

          {/* TAB 2: CREATED NUMBER SUMMARY */}
          {activeTab === 'seeds' && (
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 text-center space-y-3">
              <div className="text-4xl">🔢</div>
              <h3 className="font-black text-lg text-amber-900">만든 번호 버튼: {room.totalSeeds}개</h3>
              <p className="text-sm text-slate-600">
                번호 버튼은 메인 화면 아래의 <b>번호 만들기</b>에서 추가할 수 있습니다.
                만든 버튼 개수에 맞춰 전체 홀씨 조각 수도 자동으로 바뀝니다.
              </p>
              <div className="inline-flex px-4 py-2 rounded-full bg-white border border-amber-300 text-sm font-bold text-emerald-700">
                현재 모은 홀씨: {room.scannedSeeds.length}개
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND CUSTOMIZATION */}
          {activeTab === 'background' && (
            <div className="space-y-5">
              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  그림책 / 맞춤형 배경 이미지 등록 (브라우저 캐시 영구 보존)
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl p-6 text-center bg-amber-50/50 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('bg-file-input')?.click()}
                >
                  <input
                    id="bg-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-amber-800">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      여기로 사진을 드래그하거나 클릭하여 파일 선택
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      (PNG, JPG, WebP 권장. 브라우저 캐시에 저장되어 새로고침해도 유지됩니다)
                    </p>
                  </div>
                </div>
              </div>

              {room.customBgUrl && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={room.customBgUrl}
                      alt="Custom preview"
                      className="w-16 h-12 object-cover rounded-lg border border-slate-300"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">사용자 지정 배경 적용 중</p>
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 브라우저 로컬 저장 완료
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ customBgUrl: null })}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 cursor-pointer"
                  >
                    기본 배경으로 복구
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    배경 투명도 / 대비 조절 (하얀색 민들레 선명도 높이기)
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-600">
                    {Math.round((room.bgDim ?? 0.25) * 100)}% 어둡게
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.75"
                  step="0.05"
                  value={room.bgDim ?? 0.25}
                  onChange={(e) => onUpdateConfig({ bgDim: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2 text-sm">
                  또는 제공되는 일러스트 배경 프리셋 선택
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'spring_meadow', name: '봄날의 초록 들판', desc: '화사한 푸른 하늘과 언덕' },
                    { id: 'storybook_forest', name: '동화 속 숲속 빈터', desc: '아늑하고 신비로운 숲' },
                    { id: 'sunset_warm', name: '노을빛 들판', desc: '따뜻한 감성 저녁빛' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => onUpdateConfig({ bgPreset: preset.id, customBgUrl: null })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        room.bgPreset === preset.id && !room.customBgUrl
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5 text-amber-600 mb-1" />
                      <p className="font-bold text-xs text-slate-800">{preset.name}</p>
                      <p className="text-[10px] text-slate-500">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONNECT TABLET */}
          {activeTab === 'connect' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                  <span className="font-bold text-sm text-slate-800 mb-2">
                    태블릿 카메라로 비추면 바로 스캐너 실행
                  </span>
                  {scannerQrUrl ? (
                    <img src={scannerQrUrl} alt="Scanner QR" className="w-44 h-44 rounded-xl shadow-md border" />
                  ) : (
                    <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-xl" />
                  )}
                  <span className="text-xs text-slate-500 mt-2">
                    URL: {window.location.origin}/?mode=scanner&room={room.roomId}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600" /> 현재 기기에서 태블릿 스캐너 열기
                    </span>
                    <button
                      onClick={() => onSwitchMode('scanner')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-sm transition-colors cursor-pointer shadow"
                    >
                      스캐너 모드로 전환
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOWNLOAD & COPY FULL CODE */}
          {activeTab === 'code' && (
            <div className="space-y-5">
              {/* Top Download & Copy Actions */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-indigo-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2 text-indigo-200">
                      <FileCode className="w-5 h-5 text-amber-400" /> 프로젝트 전체 소스코드 패키지
                    </h3>
                    <p className="text-xs text-indigo-300 mt-0.5">
                      모든 백엔드 서버(`server.ts`), 리액트 컴포넌트, 설정 파일이 포함되어 있습니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direct ZIP download button */}
                    <button
                      onClick={handleDownloadZip}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>전체 코드 ZIP 다운로드 (.zip)</span>
                    </button>

                    {/* Copy All Combined button */}
                    <button
                      onClick={handleCopyAllFiles}
                      className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-white/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAll ? '전체 복사됨!' : '통합 복사'}</span>
                    </button>
                  </div>
                </div>

                {/* Local Run Guide Banner */}
                <div className="bg-black/40 p-3 rounded-xl border border-indigo-900/60 text-xs font-mono text-indigo-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>로컬 PC 실행: <code className="text-amber-300">npm install</code> ➔ <code className="text-amber-300">npm run dev</code> (포트 3000)</span>
                </div>
              </div>

              {/* File Selector & Code Viewer */}
              {isLoadingFiles ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <span className="text-xs">소스코드를 불러오는 중입니다...</span>
                </div>
              ) : projectFiles.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {/* File Selector Header */}
                  <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-xs font-bold text-slate-600">파일 선택:</span>
                      <select
                        value={selectedFileIdx}
                        onChange={(e) => setSelectedFileIdx(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 outline-none flex-1 max-w-xs cursor-pointer shadow-xs"
                      >
                        {projectFiles.map((file, idx) => (
                          <option key={file.path} value={idx}>
                            {file.path}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({projectFiles.length}개 파일)
                      </span>
                    </div>

                    {currentFile && (
                      <button
                        onClick={() => handleCopyFile(currentFile.content)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{copiedFile ? '복사 완료!' : '현재 파일 복사'}</span>
                      </button>
                    )}
                  </div>

                  {/* Code Preview Block */}
                  {currentFile && (
                    <div className="relative bg-slate-900 text-slate-100 font-mono text-xs max-h-[380px] overflow-auto p-4 scrollbar-thin">
                      <pre className="whitespace-pre">
                        <code>{currentFile.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  파일 목록을 불러올 수 없습니다. 위의 [전체 코드 ZIP 다운로드] 버튼을 이용해 주세요.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            데이터베이스 및 설정은 브라우저 캐시에 자동 저장되어 안전합니다.
          </span>
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2 rounded-xl text-sm shadow cursor-pointer transition-colors"
          >
            닫기
          </button>
        </div>

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border-2 border-rose-300">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <h3 className="font-extrabold text-lg text-slate-800">놀이를 새로 시작하시겠습니까?</h3>
              <p className="text-xs text-slate-600">
                현재까지 점등된 모든 홀씨 상태가 0개로 초기화됩니다. (배경 설정은 그대로 유지됩니다)
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 text-sm hover:bg-slate-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onReset();
                    setShowResetConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white text-sm cursor-pointer shadow"
                >
                  초기화 실행
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
