import React, { useMemo } from 'react';
import type { StageType } from '../services/roomClient';

interface DandelionHeadProps {
  seedNumbers: number[];
  scannedSeeds: number[];
  stage: StageType;
  lastScannedNumber?: number | null;
  onBlowTrigger?: () => void;
  onReturnToStart?: () => void;
}

export function DandelionHead({
  seedNumbers,
  scannedSeeds,
  stage,
  lastScannedNumber,
  onBlowTrigger,
  onReturnToStart,
}: DandelionHeadProps) {
  // Slightly irregular spacing makes the seed head feel hand-drawn and fluffy.
  const seedItems = useMemo(() => {
    const items = [];
    const totalSeeds = seedNumbers.length;
    const baseRadius = totalSeeds > 24 ? 182 : 195;
    const innerRadius = 58;

    for (let index = 0; index < totalSeeds; index++) {
      const seedNumber = seedNumbers[index];
      const angleJitter = Math.sin((index + 1) * 2.73) * Math.min(4, 34 / totalSeeds);
      const angleDeg = (360 / totalSeeds) * index - 90 + angleJitter;
      const angleRad = (angleDeg * Math.PI) / 180;
      const radius =
        baseRadius +
        Math.sin((index + 1) * 1.91) * 11 +
        Math.cos((index + 1) * 0.77) * 5;

      const xOuter = Math.cos(angleRad) * radius;
      const yOuter = Math.sin(angleRad) * radius;

      const xMid = Math.cos(angleRad) * (radius * 0.7);
      const yMid = Math.sin(angleRad) * (radius * 0.7);

      const xInner = Math.cos(angleRad) * innerRadius;
      const yInner = Math.sin(angleRad) * innerRadius;

      const isLit = scannedSeeds.includes(seedNumber);
      const isJustLit = lastScannedNumber === seedNumber;

      items.push({
        num: seedNumber,
        angleDeg,
        angleRad,
        xOuter,
        yOuter,
        xMid,
        yMid,
        xInner,
        yInner,
        isLit,
        isJustLit,
      });
    }
    return items;
  }, [seedNumbers, scannedSeeds, lastScannedNumber]);

  const isBlowingOrBeyond = stage === 'blowing' || stage === 'blooming' || stage === 'ending';
  const isBlooming = stage === 'blooming';
  const isReady = stage === 'ready_to_blow';

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-3xl mx-auto h-[560px]">
      {/* Soft storybook halo */}
      <div
        className="absolute w-[540px] h-[540px] rounded-full pointer-events-none transition-all duration-1000 -top-3"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,232,.34) 0%, rgba(98,72,42,.14) 56%, transparent 74%)',
        }}
      />

      {/* NATURAL SIDE SPARKLES (홀씨 완성 시 부드럽고 차분한 별빛 장식 - 깜빡임/렉 방지) */}
      {isReady && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {/* Left Side Sparkles - static calm accents */}
          <div className="absolute top-1/4 -left-12 flex flex-col gap-8 opacity-90">
            <span className="text-3xl text-amber-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              ✦
            </span>
            <span className="text-2xl text-white ml-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              ✨
            </span>
            <span className="text-3xl text-amber-100 -ml-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              ⋆
            </span>
          </div>

          {/* Right Side Sparkles - static calm accents */}
          <div className="absolute top-1/4 -right-12 flex flex-col gap-8 opacity-90">
            <span className="text-3xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              ✨
            </span>
            <span className="text-2xl text-amber-200 -ml-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              ✦
            </span>
            <span className="text-3xl text-white ml-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              ⋆
            </span>
          </div>

          {/* Golden/White ambient soft halo behind head */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[440px] h-[440px] rounded-full bg-white/15 blur-2xl pointer-events-none" />
        </div>
      )}

      {/* Swaying wrapper for dandelion stem and head */}
      <div
        className={`relative flex flex-col items-center origin-bottom transition-transform duration-1000 ${
          stage === 'ready_to_blow'
            ? 'animate-[dandelionSway_3.5s_easeInOut_infinite_alternate]'
            : 'animate-[dandelionGentle_5s_easeInOut_infinite_alternate]'
        }`}
        style={{
          transformOrigin: '50% 95%',
        }}
      >
        {/* --- DANDELION HEAD SVG (ENLARGED to 480x480) --- */}
        <div className="relative w-[480px] h-[480px] flex items-center justify-center">
          {/* Blowing Seeds Particle Simulation (WHITE FLUFFY SEEDS) */}
          {stage === 'blowing' && (
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {seedItems.map((s, idx) => {
                const flyX = Math.cos(s.angleRad) * (580 + (idx % 5) * 140);
                const flyY = Math.sin(s.angleRad) * (520 + (idx % 4) * 130) - 180;
                const rot = s.angleDeg + (idx % 2 === 0 ? 360 : -360);
                const delay = (idx % 7) * 0.1;

                return (
                  <div
                    key={`fly_${s.num}`}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      animation: `seedFlyAway 2.8s cubic-bezier(0.12, 0.8, 0.32, 1) ${delay}s forwards`,
                      '--fly-x': `${flyX}px`,
                      '--fly-y': `${flyY}px`,
                      '--fly-rot': `${rot}deg`,
                    } as React.CSSProperties}
                  >
                    {/* Glowing fluffy WHITE seed parachute */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-white/95 shadow-[0_0_20px_#FFFFFF] flex items-center justify-center border border-white">
                        <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_#FFF]" />
                      </div>
                      <div className="w-0.5 h-8 bg-white/90" />
                      <div className="w-2 h-2.5 rounded-full bg-amber-800" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Regular Dandelion Head (Hidden during bloom) */}
          {!isBlooming && (
            <svg
              viewBox="-250 -250 500 500"
              className={`w-full h-full overflow-visible transition-all duration-700 ${
                stage === 'blowing' ? 'opacity-0 scale-90 transition-opacity duration-1000' : 'opacity-100 scale-100'
              }`}
            >
              <defs>
                <radialGradient id="receptacleCoreGrad" cx="38%" cy="32%" r="68%">
                  <stop offset="0%" stopColor="#fffbd1" />
                  <stop offset="55%" stopColor="#ffd85c" />
                  <stop offset="100%" stopColor="#efa92e" />
                </radialGradient>
                <filter id="softSeedGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#fff7b0" floodOpacity=".95" />
                </filter>
              </defs>

              {/* Warm, friendly face in the middle */}
              <circle cx="0" cy="0" r="54" fill="#fff5ad" opacity=".28" />
              <circle cx="0" cy="0" r="44" fill="url(#receptacleCoreGrad)" stroke="#fff4ad" strokeWidth="4" />
              <ellipse cx="-18" cy="8" rx="8" ry="5" fill="#ff9a8e" opacity=".65" />
              <ellipse cx="18" cy="8" rx="8" ry="5" fill="#ff9a8e" opacity=".65" />
              <circle cx="-14" cy="-5" r="3.8" fill="#694326" />
              <circle cx="14" cy="-5" r="3.8" fill="#694326" />
              <path d="M -10 10 Q 0 20 10 10" fill="none" stroke="#694326" strokeWidth="3.5" strokeLinecap="round" />

              {/* Center Counter */}
              <text
                x="0"
                y="34"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#7b4c22"
                className="select-none font-sans"
              >
                {stage === 'ready_to_blow' ? '다 모았어요!' : `${scannedSeeds.length} / ${seedNumbers.length}`}
              </text>

              {/* Every QR number owns one fluffy seed. */}
              {seedItems.map((s) => {
                // An unscanned card has no seed on screen.
                // Scanning card N creates only seed N in its fixed position.
                if (!s.isLit) return null;

                return (
                  <g
                    key={s.num}
                    className={s.isJustLit ? 'seed-pop' : ''}
                  >
                    {/* Curved-looking soft spoke */}
                    <line
                      x1={s.xInner}
                      y1={s.yInner}
                      x2={s.xOuter}
                      y2={s.yOuter}
                      stroke="#fffdf2"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* The scanned seed appears as a bright, fluffy cloud. */}
                    <g transform={`translate(${s.xOuter}, ${s.yOuter}) rotate(${s.angleDeg + 90})`}>
                      <g filter="url(#softSeedGlow)">
                        {/* Persistent bright backing keeps completed seeds clearly visible. */}
                        <circle
                          cx="0"
                          cy="-3"
                          r="31"
                          fill="#fffde8"
                          stroke="#ffe98a"
                          strokeWidth="3"
                          opacity=".98"
                        />
                        {[
                          [-21, -2, 15],
                          [-12, -18, 16],
                          [3, -22, 17],
                          [20, -11, 15],
                          [21, 7, 14],
                          [4, 13, 17],
                          [-14, 12, 15],
                        ].map(([cx, cy, r], tIdx) => (
                          <circle
                            key={tIdx}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill={tIdx % 3 === 0 ? '#fff9c9' : '#fffef8'}
                            stroke="#fffbe3"
                            strokeWidth="2"
                          />
                        ))}
                        <circle
                          cx="0"
                          cy="0"
                          r="20"
                          fill="#fffdf2"
                          stroke="#fff7bf"
                          strokeWidth="1.5"
                        />
                      </g>

                      {/* Number stays upright and visible inside its own seed. */}
                      <g transform={`rotate(${-s.angleDeg - 90})`}>
                        <text
                          x="0"
                          y="4.5"
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="900"
                          fill="#8a5a20"
                          stroke="transparent"
                          strokeWidth=".7"
                          paintOrder="stroke"
                          className="font-sans"
                        >
                          {s.num}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}
            </svg>
          )}

          {/* --- BLOOMING USER DANDELION CHARACTER IMAGE --- */}
          {isBlooming && (
            <div className="relative w-full h-[540px] flex items-center justify-center animate-[bloomPop_1.6s_cubic-bezier(0.16,1,0.3,1)_forwards]">
              <div className="absolute w-[760px] h-[460px] rounded-[3rem] bg-amber-200/40 blur-3xl animate-pulse" />
              <img
                src="/assets/dandelion-story-bloom.jpg"
                alt="민들레 들판에서 쉬는 호랑이 동화 그림"
                className="w-[min(900px,82vw)] max-w-none h-auto rounded-[2.25rem] border-8 border-white/85 object-contain shadow-[0_20px_60px_rgba(55,94,38,.4)] drop-shadow-[0_0_28px_rgba(255,244,160,.7)] select-none pointer-events-none"
              />
              {onReturnToStart && (
                <button
                  onClick={onReturnToStart}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white hover:bg-amber-50 text-amber-900 border-4 border-amber-400 rounded-full px-8 py-3 text-lg font-black shadow-2xl cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                >
                  ↩ 처음으로 돌아가기
                </button>
              )}
            </div>
          )}
        </div>

        {/* --- DANDELION STEM & FRESH LEAVES (Only during accumulating/ready/blowing) --- */}
        {!isBlooming && (
          <div className="relative -mt-8 w-44 h-44 flex justify-center">
            <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
              {/* Main Green Stem */}
              <path
                d="M80 0 C80 45 78 95 80 160"
                stroke="#43A047"
                strokeWidth="13"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M78 6 C78 45 76 95 78 155"
                stroke="#81C784"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Left Leaf */}
              <path
                d="M78 70 Q28 55 16 78 Q40 85 76 95 Z"
                fill="#4CAF50"
                stroke="#2E7D32"
                strokeWidth="2.5"
              />
              {/* Right Leaf */}
              <path
                d="M82 85 Q132 70 144 95 Q120 100 84 112 Z"
                fill="#4CAF50"
                stroke="#2E7D32"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        )}
      </div>

      {/* --- READY TO BLOW BANNER & BUTTON --- */}
      {stage === 'ready_to_blow' && (
        <div className="absolute -bottom-6 flex flex-col items-center gap-3 z-20 animate-[bounce_2s_infinite]">
          <div className="bg-white/95 text-slate-800 px-7 py-3 rounded-full font-black text-lg shadow-2xl border-4 border-amber-300 flex items-center gap-2">
            <span>✨</span>
            <span>다 모았다! 화면을 보고 다 함께 "하나, 둘, 셋, 후~!"</span>
          </div>

          {onBlowTrigger && (
            <button
              onClick={onBlowTrigger}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold px-9 py-4 rounded-full text-xl shadow-2xl border-4 border-white/90 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <span>💨</span>
              <span>‘후~’ 바람 불기 (Space)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
