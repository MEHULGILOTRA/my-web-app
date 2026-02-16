// GoToTopButton.js
import React, { useState } from 'react';
import './GoToTopButton.css'; // Import the CSS for the button

export default function GoToTopButton() {
  // Button is always visible from start
  const [isVisible] = useState(true);

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
