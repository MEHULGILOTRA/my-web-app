import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPageSlider.css';
import images from './datasources/data-images';

function LandingPageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    if (searchTerm.trim() !== "") {
      navigate(`/search-results?destination=${encodeURIComponent(searchTerm)}`);
    }
  }, [searchTerm, navigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const visibleSlides = useMemo(() => {
    return images.filter((_, idx) => {
      const delta = Math.abs(idx - currentIndex);
      const wrapDelta = Math.abs(idx - currentIndex + images.length);
      return Math.min(delta, wrapDelta) <= 1;
    });
  }, [currentIndex]);

  const nextImages = useMemo(() => {
    return [1, 2, 3].map((offset) =>
      images[(currentIndex + offset) % images.length]
    );
  }, [currentIndex]);

  const handleDotClick = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const handleNextImageClick = useCallback((offset) => {
    setCurrentIndex((prev) => (prev + offset + 1) % images.length);
  }, []);

  return (
    <section className="landing-page-slider">
      {visibleSlides.map((imgObj) => {
        const idx = images.indexOf(imgObj);
        const isActive = idx === currentIndex;
        return (
          <div key={idx} className={`slide ${isActive ? 'active' : ''}`}>
            <img
              src={imgObj.src}
              alt={`Slide ${idx + 1}`}
              className="image-slider"
              loading={isActive ? "eager" : "lazy"}
            />
            {isActive && (
              <div className="image-description">
                {imgObj.description[`imag${idx + 1}`]}
              </div>
            )}
          </div>
        );
      })}

      <div className="overlay"></div>

      <div className="dots-container">
        {images.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? 'active-dot' : ''}`}
            onClick={() => handleDotClick(index)}
          ></span>
        ))}
      </div>

      <div className="next-images-container">
        {nextImages.map((image, index) => (
          <div
            key={index}
            className="next-image-preview"
            onClick={() => handleNextImageClick(index)}
          >
            <img
              src={image.src}
              alt={`Next Preview ${index + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Where do you want to travel?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-button" onClick={handleSearch}>
          🔍
        </button>
      </div>
    </section>
  );
}

export default LandingPageSlider;
