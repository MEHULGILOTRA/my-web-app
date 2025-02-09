import React, { useEffect, useState } from 'react';
import images from './datasources/data-images';
import './DestinationHighlights.css';

const DestinationHighlights = () => {
  const [index, setIndex] = useState(0);
  const [borderColor, setBorderColor] = useState('rgba(255, 255, 255, 0.6)');
  const totalImages = images.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % totalImages); // Change images every 3 seconds
    }, 3000);

    const borderInterval = setInterval(() => {
      // Change the border color of the main image every 5 seconds
      setBorderColor(
        `hsl(${Math.random() * 360}, 100%, 70%)`
      );
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(borderInterval);
    };
  }, [totalImages]);

  return (
    <section className="destination-highlights">
      <h2>Top Destinations</h2>
      <div className="scroll-container">
        <div className="scroll-line">
          {images.map((image, i) => {
            return (
              <div
                key={i}
                className={`scroll-item ${i === index ? 'main-item' : ''}`}
                style={{
                  borderColor: i === index ? borderColor : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                <img
                  src={image.src}
                  alt={image.description}
                  className={i === index ? 'main-image' : ''}
                />
                <p>{image.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DestinationHighlights;
