import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './LandingPageSlider.css';
import images from './datasources/data-images';

function LandingPageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate(); // Initialize navigation

  const handleSearch = () => {
    if (searchTerm.trim() !== "") {
      navigate(`/search-results?destination=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="landing-page-slider">
      {/* Image slider */}
      {images.map((image, index) => (
        <div key={index} className={`slide ${index === currentIndex ? 'active' : ''}`}>
          <img src={image.src} alt={`Slide ${index + 1}`} className="image-slider" />
          {index === currentIndex && (
            <div className="image-description">
              {image.description[`imag${index + 1}`]}
            </div>
          )}
        </div>
      ))}

      {/* Search Bar */}
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
