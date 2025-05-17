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

  // ─── Smooth Slide Scheduler ───────────────────────────────────────────────
  useEffect(() => {
    let timeoutId;
    const scheduleNext = () => {
      requestAnimationFrame(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      });
      timeoutId = window.setTimeout(scheduleNext, 3000);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  // ─── Build the “active + neighbors” window ───────────────────────────────
  const visibleSlides = images.filter((_, idx) => {
    const delta = Math.abs(idx - currentIndex);
    // wrap‑around distance for end→start
    const wrapDelta = Math.abs(idx - currentIndex + images.length);
    return Math.min(delta, wrapDelta) <= 1;
  });
  // ─── The next-3 previews (circularly) ──────────────────────────────────
  const nextImages = [1,2,3].map((offset) =>
    images[(currentIndex + offset) % images.length]
  );

    return (
      <section className="landing-page-slider">
        {/* Image slider */}
        {visibleSlides.map((imgObj, _, arr) =>
        {
          const idx = images.indexOf(imgObj);
          const isActive = idx === currentIndex;
          return (
          <div
          key={idx}
          className={`slide ${ isActive ? 'active' : ''}`}
        >
          {/* <img
            src={image.src}
            alt={`Slide ${index + 1}`}
            style={{ width: '100%', height: '100vh', objectFit: 'cover' }}
          /> */}
        <img
          srcSet={`
            ${imgObj.src}?w=480 480w,
            ${imgObj.src}?w=768 768w,
            ${imgObj.src}?w=1366 1366w,
            ${imgObj.src}?w=1920 1920w
          `}
          sizes="(max-width: 480px) 100vw,
                (max-width: 768px) 100vw,
                (max-width: 1366px) 100vw,
                100vw"
          src={imgObj.src}
          alt={`Slide ${idx + 1}`}
          className = "image-slider"
        />

          {isActive && (
              <div className="image-description">
                {imgObj.description[`imag${idx + 1}`]}
              </div>
            )}
          </div>
  )})}
        {/* Overlay Text */}
        <div className="overlay">
          {/* <h1>Discover Your Next Adventure</h1>
          <p>Explore the world with our exclusive travel packages</p> */}
          {/* <button className="button">Get Started</button> */}
        </div>

        {/* Navigation Dots */}
        <div className="dots-container">
          {images.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentIndex ? 'active-dot' : ''}`}
              onClick={() => setCurrentIndex(index)} // Click on dot to navigate to a specific slide
            ></span>
          ))}
        </div>

        {/* Next 3 Image Previews at the Bottom */}
        <div className="next-images-container">
          {nextImages.map((image, index) => (
            <div
              key={index}
              className="next-image-preview"
              onClick={() => setCurrentIndex((currentIndex + index + 1) % images.length)}
            >
              <img
                src={image.src}
                alt={`Next Preview ${index + 1}`}
                style={{ maxWidth: '80px', height: 'auto', objectFit: 'cover' }}
                />
            </div>
          ))}
        </div>


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
