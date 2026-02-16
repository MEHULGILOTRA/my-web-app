import React, { useEffect, useState, useMemo } from 'react';
import images from './datasources/data-images';
import './DestinationHighlights.css';

const DestinationHighlights = () => {
  const [index, setIndex] = useState(0);
  const [borderColor, setBorderColor] = useState('rgba(255, 255, 255, 0.6)');
  const totalImages = images.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % totalImages);
    }, 3000);

    return () => clearInterval(interval);
  }, [totalImages]);

  useEffect(() => {
    const borderInterval = setInterval(() => {
      setBorderColor(`hsl(${Math.random() * 360}, 100%, 70%)`);
    }, 5000);

    return () => clearInterval(borderInterval);
  }, []);

  const handleImageClick = (clickedIndex) => {
    setIndex(clickedIndex);
  };

  const renderedImages = useMemo(() => {
    return images.map((image, i) => {
      const isMain = i === index;
      return (
        <div
          key={i}
          className={`scroll-item ${isMain ? 'main-item' : ''}`}
          style={{
            borderColor: isMain ? borderColor : 'rgba(255, 255, 255, 0.6)',
          }}
          onClick={() => handleImageClick(i)}
        >
          <img
            src={image.src}
            alt={image.description}
            className={isMain ? 'main-image' : ''}
            loading="lazy"
          />
          <p>{image.description}</p>
        </div>
      );
    });
  }, [index, borderColor]);

  return (
    <section className="destination-highlights">
      <h2>Top Destinations</h2>
      <div className="scroll-container">
        <div className="scroll-line">
          {renderedImages}
        </div>
      </div>
    </section>
  );
};

export default DestinationHighlights;
