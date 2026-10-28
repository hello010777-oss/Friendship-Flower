import React from 'react';
import type { StageType } from '../services/roomClient';
import { AmbientFloatingSeeds } from './AmbientFloatingSeeds';

interface BackgroundViewProps {
  customBgUrl: string | null;
  bgPreset: string;
  stage: StageType;
  bgDim?: number;
  children: React.ReactNode;
}

export function BackgroundView({
  customBgUrl,
  bgPreset,
  stage,
  bgDim = 0.25,
  children,
}: BackgroundViewProps) {
  const isSpring = stage === 'blooming' || stage === 'ending';

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-slate-950">
      {/* 1. Custom Uploaded Background if set */}
      {customBgUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${customBgUrl})`,
            filter: isSpring ? 'saturate(1.2) brightness(1.05)' : 'brightness(0.92)',
          }}
        />
      ) : (
        /* 2. Preset Illustrated Backgrounds */
        <div className="absolute inset-0 transition-all duration-1000">
          {bgPreset === 'storybook_forest' ? (
            <div className="absolute inset-0 bg-gradient-to-b from-[#2d5a44] via-[#1b3d2b] to-[#12261b]">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_30%,#a8e6cf_0%,transparent_60%)]" />
              <svg className="absolute bottom-0 w-full h-64 text-[#0f2416]" preserveAspectRatio="none" viewBox="0 0 1440 320">
                <path fill="currentColor" d="M0,192L80,186.7C160,181,320,171,480,186.7C640,203,800,245,960,245.3C1120,245,1280,203,1360,181.3L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
              </svg>
            </div>
          ) : bgPreset === 'sunset_warm' ? (
            <div className="absolute inset-0 bg-gradient-to-b from-[#fca311] via-[#d45d79] to-[#3a2042]">
              <div className="absolute bottom-0 w-full h-56 bg-gradient-to-t from-[#221028] to-transparent" />
            </div>
          ) : (
            /* Default: Spring Meadow */
            <div className="absolute inset-0 bg-gradient-to-b from-[#5ebde3] via-[#a8def3] to-[#86cc72]">
              <div className="absolute top-12 right-24 w-32 h-32 rounded-full bg-yellow-200/80 blur-xl animate-pulse" />
              <div className="absolute top-16 right-28 w-24 h-24 rounded-full bg-yellow-100 shadow-[0_0_50px_#fde047]" />

              <svg className="absolute bottom-24 w-full h-80 text-[#6cb563] opacity-80" preserveAspectRatio="none" viewBox="0 0 1440 320">
                <path fill="currentColor" d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,144C840,149,960,203,1080,213.3C1200,224,1320,192,1380,176L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
              </svg>

              <svg className="absolute bottom-0 w-full h-64 text-[#4f9b43]" preserveAspectRatio="none" viewBox="0 0 1440 320">
                <path fill="currentColor" d="M0,224L60,208C120,192,240,160,360,176C480,192,600,256,720,261.3C840,267,960,213,1080,192C1200,171,1320,181,1380,186.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
              </svg>
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#36722d] to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Background Opacity / Contrast Overlay (배경의 투명도를 설정하여 민들레가 잘 보이도록) */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 bg-black"
        style={{ opacity: bgDim }}
      />

      {/* Spring Warm Golden Sunbeam Transition Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1500 ${
          isSpring ? 'opacity-100' : 'opacity-0'
        } bg-gradient-to-t from-amber-400/20 via-yellow-200/15 to-transparent mix-blend-overlay`}
      />

      {/* Floating Golden Flower Pollen particles when in spring / ending */}
      {isSpring && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 18 }).map((_, idx) => (
            <div
              key={idx}
              className="absolute w-2 h-2 rounded-full bg-yellow-200/80 shadow-[0_0_8px_#FEE440] animate-[pollenFloat_6s_infinite_ease-in-out]"
              style={{
                left: `${(idx * 17 + 5) % 100}%`,
                top: `${(idx * 23 + 10) % 90}%`,
                animationDelay: `${idx * 0.35}s`,
                animationDuration: `${4 + (idx % 4)}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* AMBIENT FLOATING WHITE DANDELION SEEDS (화면 전체적으로 민들레 홀씨가 바람에 날리는 연한 애니메이션) */}
      <AmbientFloatingSeeds />

      {/* Foreground Content */}
      <div className="relative z-20 w-full h-full flex flex-col">{children}</div>
    </div>
  );
}
