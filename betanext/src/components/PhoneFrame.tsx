import React from 'react';

interface PhoneFrameProps {
  src?: string;
  alt?: string;
  children?: React.ReactNode;
}

export default function PhoneFrame({ src, alt, children }: PhoneFrameProps) {
  return (
    <div className="relative w-[300px] h-[360px] mx-auto">
      {/* iPhone Frame */}
      <div className="relative w-full h-full bg-black rounded-[40px] p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>
        
        {/* Screen */}
        <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative">
          {/* Content Area */}
          <div className="h-full">
            {children || (
              <img 
                src={src || ''} 
                alt={alt || ''} 
                className="w-full h-full object-cover" 
              />
            )}
          </div>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full"></div>
      </div>
    </div>
  );
}
