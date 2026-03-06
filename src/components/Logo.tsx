import React from 'react';
import { Leaf, Shield, Globe } from 'lucide-react';

interface LogoProps {
  className?: string;
  imageUrl?: string | null;
}

export const Logo: React.FC<LogoProps> = ({ className = "", imageUrl }) => {
  if (imageUrl) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img 
          src={imageUrl} 
          alt="ExploreX Logo" 
          className="w-12 h-12 rounded-2xl shadow-2xl border-2 border-emerald-500/30 object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col -space-y-1">
          <span className="text-2xl font-black tracking-tighter text-emerald-900 uppercase leading-none">EXPLOREX</span>
          <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-[0.3em] ml-0.5">AI Generated</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-12 h-12 group">
        {/* Outer Glow */}
        <div className="absolute -inset-1 bg-emerald-400/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        
        {/* Main Shield Shape (Safety) */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          
          {/* Shield Base */}
          <path 
            d="M50 5 L90 20 V50 C90 75 70 90 50 95 C30 90 10 75 10 50 V20 L50 5 Z" 
            fill="url(#logoGradient)"
            className="transition-all duration-500"
          />
          
          {/* Cultural Heritage (Temple/Stupa Silhouette) */}
          <path 
            d="M35 65 H65 L60 55 H40 L35 65 Z M40 55 H60 L55 45 H45 L40 55 Z M45 45 H55 L50 35 L45 45 Z" 
            fill="white" 
            fillOpacity="0.3"
          />
          
          {/* Green Tourism (Leaf) */}
          <path 
            d="M50 35 C65 35 75 50 75 65 C75 80 60 85 50 85 C40 85 25 80 25 65 C25 50 35 35 50 35 Z" 
            fill="white"
            fillOpacity="0.2"
          />
          <path 
            d="M50 40 C60 40 68 52 68 65 C68 75 58 80 50 80 C42 80 32 75 32 65 C32 52 40 40 50 40 Z" 
            fill="white"
          />
          <path 
            d="M50 80 V40" 
            stroke="#059669" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="flex flex-col -space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black tracking-tighter text-emerald-900 uppercase leading-none">EXPLOREX</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.4em] ml-0.5">Green</span>
          <div className="w-1 h-1 rounded-full bg-emerald-200" />
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.4em]">Heritage</span>
          <div className="w-1 h-1 rounded-full bg-emerald-200" />
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.4em]">Safe</span>
        </div>
      </div>
    </div>
  );
};
