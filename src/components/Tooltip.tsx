import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string | null;
}

export default function Tooltip({ children, content }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help border-b border-dotted border-gray-400"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-pre-line -top-2 left-0 transform -translate-y-full pointer-events-none min-w-max">
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 left-4 -bottom-1"></div>
        </div>
      )}
    </div>
  );
}
