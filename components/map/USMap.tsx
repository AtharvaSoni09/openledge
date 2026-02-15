'use client';

import { useState } from 'react';
import usaMapData from '@svg-maps/usa';

interface USMapProps {
  selected: string | null; // null = "all/nationally" or nothing
  onSelect?: (code: string) => void;
  interactive?: boolean;
  className?: string;
  highlightAll?: boolean; // when true + selected===null, softly highlight every state
}

export default function USMap({
  selected,
  onSelect,
  interactive = true,
  className = '',
  highlightAll = false,
}: USMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Tooltip */}
      {hovered && interactive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-10 font-sans tracking-wide">
          {usaMapData.locations.find((l: any) => l.id === hovered)?.name ?? hovered.toUpperCase()}
        </div>
      )}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={usaMapData.viewBox}
        className="w-full h-auto"
        role="img"
        aria-label="Map of the United States"
      >
        {usaMapData.locations.map((location: any) => {
          const code = location.id.toUpperCase();
          const isSelected = selected === code;
          const isHovered = hovered === location.id;
          const allMode = !selected && highlightAll;

          return (
            <path
              key={location.id}
              d={location.path}
              onClick={() => interactive && onSelect?.(code)}
              onMouseEnter={() => interactive && setHovered(location.id)}
              onMouseLeave={() => interactive && setHovered(null)}
              className={`${interactive ? 'cursor-pointer' : ''} transition-colors duration-150`}
              fill={
                isSelected
                  ? '#2563eb'
                  : isHovered
                    ? '#93c5fd'
                    : allMode
                      ? '#bfdbfe'       // soft blue for national mode
                      : '#e4e4e7'
              }
              stroke="#fff"
              strokeWidth={1}
              aria-label={location.name}
            />
          );
        })}
      </svg>
    </div>
  );
}
