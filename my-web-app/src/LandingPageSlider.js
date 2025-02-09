import React, { useState, useEffect } from 'react';
import './LandingPageSlider.css';
import images from './datasources/data-images';

// import imag1 from './images/imag1.jpeg';
// import imag2 from './images/imag2.jpeg';
// import imag3 from './images/imag3.jpeg';
// import imag4 from './images/imag4.jpeg';
// import imag5 from './images/imag5.jpeg';
// import imag6 from './images/imag6.jpeg';
// import imag7 from './images/imag7.jpeg';
// import imag8 from './images/imag8.jpeg';

// // Dictionary with image names and descriptions
// const imageDescriptions = {
//   imag1: 'SYDNEY',
//   imag2: 'Place 2',
//   imag3: 'Place 3',
//   imag4: 'Place 4',
//   imag5: 'Place 5',
//   imag6: 'Place 6',
//   imag7: 'Place 7',
//   imag8: 'Place 8',
// };

// // Array of images
// const images = [imag1, imag2, imag3, imag4, imag5, imag6, imag7, imag8];

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
      <p className="paragraph-hide">
        ....................................................................................................................................................................................................................
      </p>
      {images.map((image, index) => (
        <div
          key={index}
          className={`slide ${index === currentIndex ? 'active' : ''}`}
        >
          <img
            src={image.src}
            alt={`Slide ${index + 1}`}
            style={{ width: '100%', height: '100vh', objectFit: 'cover' }}
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
              style={{ width: '80px', height: 'auto', objectFit: 'cover' }}
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
