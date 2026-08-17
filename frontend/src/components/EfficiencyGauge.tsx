import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface Props {
  vaSec: number;
  totalSec: number;
}

export function EfficiencyGauge({ vaSec, totalSec }: Props) {
  const [displayPct, setDisplayPct] = useState(0);
  const controls = useAnimation();
  
  const pct = totalSec > 0 ? (vaSec / totalSec) * 100 : 0;
  
  useEffect(() => {
    controls.start({
      strokeDasharray: `${pct} 100`,
      transition: { duration: 1.5, ease: "easeOut" }
    });
    
    // Animate the number counting up
    let startTime: number | null = null;
    const duration = 1500;
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayPct(pct * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [pct, controls]);

  // Value Add is always represented in green
  const color = "var(--color-va)";

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-md border border-line bg-raised h-full relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-va/5 rounded-full blur-2xl" />
      
      <div className="text-sm font-semibold text-ink-dim mb-4 self-start w-full">Efficiency Score</div>
      
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Background Arc */}
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.91549430918954"
            fill="transparent"
            stroke="var(--color-raised-2)"
            strokeWidth="3.5"
          />
          {/* Foreground Arc */}
          <motion.circle
            cx="18"
            cy="18"
            r="15.91549430918954"
            fill="transparent"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ strokeDasharray: "0 100" }}
            animate={controls}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-4xl font-extrabold" style={{ color }}>
            {Math.round(displayPct)}<span className="text-xl">%</span>
          </div>
          <div className="text-[10px] uppercase font-mono tracking-wide text-ink-faint mt-1">Value Add</div>
        </div>
      </div>
    </div>
  );
}
