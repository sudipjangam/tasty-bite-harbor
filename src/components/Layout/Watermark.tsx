
import React from 'react';

interface WatermarkProps {
  className?: string;
}

const Watermark: React.FC<WatermarkProps> = ({ className = "" }) => {
  return (
    <div className={`fixed bottom-2 right-4 text-xs text-muted-foreground/70 select-none pointer-events-none z-10 ${className}`}>
      Powered by Swadeshi Solutions
    </div>
  );
};

export default Watermark;
