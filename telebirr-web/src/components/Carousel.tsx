import { useEffect, useState } from 'react';
import { BANNERS } from '../data';

export default function Carousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % BANNERS.length), 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div className="carousel" aria-label="Promotions">
        {BANNERS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`telebirr promotion ${i + 1}`}
            className={i === index ? 'active' : ''}
            draggable={false}
          />
        ))}
      </div>
      <div className="dots" role="tablist" aria-label="Promotion selector">
        {BANNERS.map((src, i) => (
          <button
            key={src}
            className={`dot${i === index ? ' active' : ''}`}
            onClick={() => setIndex(i)}
            role="tab"
            aria-selected={i === index}
            aria-label={`Promotion ${i + 1}`}
          />
        ))}
      </div>
    </>
  );
}
