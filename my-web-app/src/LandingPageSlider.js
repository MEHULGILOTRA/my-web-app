import React, { useState, useEffect } from 'react';
import './LandingPageSlider.css';
import images from './datasources/data-images';

function LandingPageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // 3 seconds transition interval

    return () => clearInterval(interval); // Cleanup the interval on component unmount
  }, []);

  const nextImages = [
    images[(currentIndex + 1) % images.length],
    images[(currentIndex + 2) % images.length],
    images[(currentIndex + 3) % images.length],
  ];

  return (
    <section className="landing-page-slider">
      {/* Images Slider */}
      {/* <p className="paragraph-hide">
        ....................................................................................................................................................................................................................
      </p> */}
      {images.map((image, index) => (
        <div
          key={index}
          className={`slide ${index === currentIndex ? 'active' : ''}`}
        >
          {/* <img
            src={image.src}
            alt={`Slide ${index + 1}`}
            style={{ width: '100%', height: '100vh', objectFit: 'cover' }}
          /> */}
<img
  srcSet={`
    ${image.src}?w=320 320w,
    ${image.src}?w=480 480w,
    ${image.src}?w=768 768w,
    ${image.src}?w=1024 1024w,
    ${image.src}?w=1366 1366w,
    ${image.src}?w=1920 1920w,
    ${image.src}?w=2560 2560w,
    ${image.src}?w=3840 3840w,
    ${image.src}?w=4096 4096w
  `}
  sizes="(max-width: 320px) 100vw,
         (max-width: 480px) 100vw,
         (max-width: 768px) 100vw,
         (max-width: 1024px) 100vw,
         (max-width: 1366px) 100vw,
         (max-width: 1920px) 100vw,
         (max-width: 2560px) 100vw,
         100vw"
  src={image.src}
  alt={`Slide ${index + 1}`}
  className = "image-slider"
/>

          {/* Display Description at Center-Left */}
          {index === currentIndex && (
            <div className="image-description">
              {image.description[`imag${index + 1}`]}
            </div>
          )}
        </div>
      ))}

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
        <input type="text" placeholder="Where do you want to travel?" />
        <span className="search-icon">🔍</span>
      </div>
    </section>
  );
}

export default LandingPageSlider;
