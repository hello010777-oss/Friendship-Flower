import React, { useMemo } from 'react';

/**
 * Ambient floating white dandelion seed fluffs drifting gently across the whole screen.
 * Meets requirement: "화면 전체적으로 민들레 홀씨가 바람에 날리는 애니메이션이 연하게 들어갔으면 좋겠어"
 */
export function AmbientFloatingSeeds() {
  const seeds = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${(i * 24 + 11) % 100}%`,
      top: `${(i * 19 + 7) % 100}%`,
      size: 16 + (i % 3) * 5,
      opacity: 0.25 + (i % 3) * 0.1,
      duration: 16 + (i % 4) * 4,
      delay: -(i * 2.5),
      swayDuration: 4 + (i % 2) * 1.5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-15">
      {seeds.map((s) => (
        <div
          key={s.id}
          className="absolute will-change-transform"
          style={{
            left: s.left,
            top: s.top,
            animation: `ambientDrift ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
            opacity: s.opacity,
          }}
        >
          {/* Inner swaying wrapper */}
          <div
            className="flex flex-col items-center will-change-transform"
            style={{
              animation: `ambientSway ${s.swayDuration}s ease-in-out infinite alternate`,
              width: `${s.size}px`,
            }}
          >
            {/* White feathery umbrella */}
            <svg
              viewBox="0 0 40 40"
              className="w-full h-auto text-white"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Radiating umbrella bristles */}
              {[-36, -20, 0, 20, 36].map((deg, idx) => (
                <line
                  key={idx}
                  x1="20"
                  y1="24"
                  x2={20 + Math.sin((deg * Math.PI) / 180) * 18}
                  y2={24 - Math.cos((deg * Math.PI) / 180) * 18}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              ))}
              {/* Center fluffy point */}
              <circle cx="20" cy="24" r="2.5" fill="#FFFFFF" />
              {/* Seed spine */}
              <line x1="20" y1="24" x2="20" y2="34" stroke="#FFFFFF" strokeWidth="1" />
              {/* Seed grain */}
              <circle cx="20" cy="35" r="1.5" fill="#475569" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
