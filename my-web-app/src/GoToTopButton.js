// GoToTopButton.js
import React, { useState, useEffect } from 'react';
import './GoToTopButton.css'; // Import the CSS for the button

export default function GoToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Toggle button visibility based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to scroll to the top
  const goToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    isVisible && (
      <button className="go-to-top-button" onClick={goToTop}>
      </button>
    )
  );
}
