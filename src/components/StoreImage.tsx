import { useState } from 'react';
import { Package } from 'lucide-react';

interface StoreImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function StoreImage({ src, alt, className = '' }: StoreImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F5F7] to-[#E8E8ED] text-[#86868B] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium text-[#6E6E73] line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
