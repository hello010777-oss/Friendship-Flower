import React from 'react';

/**
 * High-quality, friendly Korean baby tiger (아기 호랑이) and Dandelion characters
 * designed specifically for early childhood educational play.
 */

export function TigerHead({ className = 'w-16 h-16', emotion = 'happy' }: { className?: string; emotion?: 'happy' | 'cheer' | 'gentle' }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="tigerFaceGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFAE42" />
          <stop offset="100%" stopColor="#EA7317" />
        </radialGradient>
        <filter id="tigerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Ears */}
      <circle cx="28" cy="30" r="18" fill="#E86C15" filter="url(#tigerGlow)" />
      <circle cx="28" cy="30" r="11" fill="#FFF2D6" />
      <circle cx="92" cy="30" r="18" fill="#E86C15" filter="url(#tigerGlow)" />
      <circle cx="92" cy="30" r="11" fill="#FFF2D6" />

      {/* Head */}
      <circle cx="60" cy="65" r="46" fill="url(#tigerFaceGrad)" filter="url(#tigerGlow)" />

      {/* Forehead Tiger Stripes (왕자 무늬 - 王) */}
      <path d="M46 36 H74" stroke="#442211" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 43 H70" stroke="#442211" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 33 V47" stroke="#442211" strokeWidth="3.5" strokeLinecap="round" />

      {/* Side Stripes */}
      <path d="M18 56 Q28 58 22 65" stroke="#442211" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M19 72 Q29 70 23 79" stroke="#442211" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M102 56 Q92 58 98 65" stroke="#442211" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M101 72 Q91 70 97 79" stroke="#442211" strokeWidth="3.5" strokeLinecap="round" />

      {/* Cheeks / Muzzle */}
      <ellipse cx="60" cy="76" rx="26" ry="18" fill="#FFFFFF" opacity="0.95" />

      {/* Pink Blush */}
      <ellipse cx="32" cy="72" rx="9" ry="6" fill="#FF8484" opacity="0.65" />
      <ellipse cx="88" cy="72" rx="9" ry="6" fill="#FF8484" opacity="0.65" />

      {/* Eyes */}
      {emotion === 'happy' || emotion === 'cheer' ? (
        <>
          {/* Smiling curved eyes ^ ^ */}
          <path d="M40 60 Q48 50 56 60" stroke="#2B1600" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M64 60 Q72 50 80 60" stroke="#2B1600" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          {/* Big curious eyes with spark */}
          <ellipse cx="46" cy="58" rx="6" ry="7" fill="#2B1600" />
          <circle cx="44" cy="55" r="2.5" fill="#FFFFFF" />
          <ellipse cx="74" cy="58" rx="6" ry="7" fill="#2B1600" />
          <circle cx="72" cy="55" r="2.5" fill="#FFFFFF" />
        </>
      )}

      {/* Nose */}
      <polygon points="60,70 54,64 66,64" fill="#C43C3C" />

      {/* Smiling Mouth */}
      <path d="M60 70 V75 M54 75 Q60 82 66 75" stroke="#442211" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Dancing Tiger and Blooming Dandelion together for the ending scene
 */
export function DancingFriends({ className = 'w-full h-80' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Golden Sparkling Aura */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-300/20 blur-3xl animate-pulse pointer-events-none" />

      <svg viewBox="0 0 460 300" className="w-full h-full max-w-xl select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="friendAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE066" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFE066" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="160" cy="275" rx="45" ry="12" fill="#1C3814" opacity="0.25" />
        <ellipse cx="300" cy="275" rx="45" ry="12" fill="#1C3814" opacity="0.25" />

        {/* --- TIGER CHARACTER (LEFT) --- */}
        <g className="animate-[bounce_1.4s_infinite_ease-in-out]">
          {/* Tiger Tail */}
          <path
            d="M90 230 C60 215 50 170 75 160 C85 155 92 165 80 180 C70 195 85 210 105 220"
            stroke="#EA7317"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path d="M72 165 C76 160 82 163 78 172" stroke="#442211" strokeWidth="5" strokeLinecap="round" />

          {/* Tiger Feet */}
          <ellipse cx="130" cy="265" rx="14" ry="10" fill="#E86C15" />
          <ellipse cx="165" cy="265" rx="14" ry="10" fill="#E86C15" />

          {/* Tiger Body */}
          <ellipse cx="145" cy="210" rx="36" ry="46" fill="#F48C1C" />
          {/* White Belly */}
          <ellipse cx="150" cy="218" rx="22" ry="30" fill="#FFF5E4" />

          {/* Tiger Arm reaching out to Dandelion */}
          <path d="M172 195 C200 190 215 190 225 185" stroke="#F48C1C" strokeWidth="12" strokeLinecap="round" />
          {/* Tiger Left Arm swinging cheerfully */}
          <path d="M115 195 C95 185 85 165 80 150" stroke="#F48C1C" strokeWidth="11" strokeLinecap="round" />

          {/* Tiger Head */}
          <g transform="translate(85, 80)">
            <TigerHead className="w-28 h-28" emotion="happy" />
          </g>
        </g>

        {/* --- CONNECTED HANDS & HEART --- */}
        <g className="animate-[pulse_1s_infinite]">
          {/* Little heart above their holding hands */}
          <path
            d="M230 155 C230 145 220 140 215 147 C210 140 200 145 200 155 C200 167 215 178 215 178 C215 178 230 167 230 155 Z"
            fill="#FF4D6D"
          />
          {/* Golden sparkle on held hands */}
          <circle cx="232" cy="184" r="5" fill="#FFE600" />
        </g>

        {/* --- DANDELION FLOWER FRIEND (RIGHT) --- */}
        <g className="animate-[bounce_1.4s_infinite_ease-in-out_0.2s]">
          {/* Green Stem & Leaves */}
          <path d="M300 270 Q305 230 295 190" stroke="#489B37" strokeWidth="9" strokeLinecap="round" fill="none" />
          {/* Leaves */}
          <path d="M295 240 Q265 245 270 230 Q285 232 295 235" fill="#58B342" />
          <path d="M300 230 Q335 235 330 220 Q315 222 300 225" fill="#58B342" />

          {/* Cute leaf feet */}
          <ellipse cx="285" cy="272" rx="14" ry="7" fill="#489B37" />
          <ellipse cx="315" cy="272" rx="14" ry="7" fill="#489B37" />

          {/* Arm holding Tiger's hand */}
          <path d="M275 195 C255 190 240 188 230 185" stroke="#58B342" strokeWidth="8" strokeLinecap="round" />
          {/* Right Arm cheering up */}
          <path d="M325 190 C345 175 355 155 365 145" stroke="#58B342" strokeWidth="8" strokeLinecap="round" />

          {/* Big Yellow Blooming Dandelion Head */}
          <g transform="translate(298, 125)">
            {/* Outer Petals */}
            {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((deg) => (
              <g key={deg} transform={`rotate(${deg})`}>
                <ellipse cx="0" cy="-48" rx="8" ry="24" fill="#FDCB24" />
                <ellipse cx="0" cy="-46" rx="5" ry="18" fill="#FFE266" />
                <circle cx="0" cy="-60" r="3" fill="#FFF494" />
              </g>
            ))}
            {/* Center Flower Face */}
            <circle cx="0" cy="0" r="32" fill="#F8B100" />
            <circle cx="0" cy="0" r="28" fill="#FDCB24" />

            {/* Rosy Cheeks */}
            <circle cx="-16" cy="6" r="6" fill="#FF708F" opacity="0.75" />
            <circle cx="16" cy="6" r="6" fill="#FF708F" opacity="0.75" />

            {/* Happy Eyes */}
            <path d="M-18 -4 Q-12 -12 -6 -4" stroke="#442200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M6 -4 Q12 -12 18 -4" stroke="#442200" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Smiling Mouth with Cute Tongue */}
            <path d="M-8 8 Q0 18 8 8" stroke="#442200" strokeWidth="2.5" strokeLinecap="round" fill="#E63946" />
          </g>
        </g>

        {/* Fluttering Butterflies */}
        <g className="animate-[ping_3s_infinite_ease-in-out]">
          <path d="M80 80 Q90 65 95 80 Q90 95 80 80 Z" fill="#64DFDF" opacity="0.8" />
          <path d="M75 80 Q65 65 60 80 Q65 95 75 80 Z" fill="#72EFDD" opacity="0.8" />
          <circle cx="77" cy="80" r="3" fill="#3A86C8" />
        </g>
        <g className="animate-[bounce_2.5s_infinite_ease-in-out_0.5s]" transform="translate(350, 60)">
          <path d="M20 20 Q30 5 35 20 Q30 35 20 20 Z" fill="#FF9E00" opacity="0.85" />
          <path d="M15 20 Q5 5 0 20 Q5 35 15 20 Z" fill="#FFD000" opacity="0.85" />
          <circle cx="17" cy="20" r="2.5" fill="#E85D04" />
        </g>
      </svg>
    </div>
  );
}
