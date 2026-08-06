import React from 'react';

export function BrandLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#brandGrad)" />
        
        {/* Factory Building */}
        <path d="M 15 85 L 15 55 L 30 65 L 30 55 L 45 65 L 45 55 L 60 65 L 60 45 L 85 45 L 85 85 Z" fill="white" />
        
        {/* Factory Windows */}
        <rect x="25" y="70" width="8" height="8" fill="url(#brandGrad)" />
        <rect x="42" y="70" width="8" height="8" fill="url(#brandGrad)" />
        <rect x="59" y="70" width="8" height="8" fill="url(#brandGrad)" />
        
        {/* Robotic Arm */}
        <path d="M 22 55 L 22 38 L 40 25 L 55 42" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="38" r="4.5" fill="white" stroke="#0F172A" strokeWidth="3" />
        <circle cx="40" cy="25" r="4.5" fill="white" stroke="#0F172A" strokeWidth="3" />
        
        {/* Robotic Claw */}
        <path d="M 55 42 L 50 48 M 55 42 L 62 46" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
        <path d="M 50 48 L 52 52 M 62 46 L 60 50" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function BrandTitle({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold uppercase tracking-wide leading-none ${className}`}>
      <span className="text-white">FACTORY</span>
      <span className="text-[#4fd1c5]">ANALYSIS</span>
    </span>
  );
}
