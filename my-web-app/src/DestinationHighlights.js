import React from 'react';
import './DestinationHighlights.css';
import paris from './images/paris.jpeg'; 
import greece from './images/greece.jpeg';
import singapore from './images/singapore.jpeg';

function DestinationHighlights() {
  return (
    <section className="destination-highlights">
      <h2>Top Destinations</h2>
      <div className="destination-cards">
        <div className="card">
            <img
                src={paris} 
                alt="" 
                style={{ height: '80px', marginLeft: '30px' }} // Adjust height as needed
                />
          <h3>Paris</h3>
          <p>Indulge in timeless romance and artistic charm.</p>
        </div>
        <div className="card">
        <img
                src={greece} 
                alt="" 
                style={{ height: '80px', marginLeft: '30px' }} // Adjust height as needed
                />
          <h3>Greece</h3>
          <p>Immerse yourself in ancient history and stunning island views.</p>
        </div>
        <div className="card">
        <img
                src={singapore} 
                alt="" 
                style={{ height: '80px', marginLeft: '30px' }} // Adjust height as needed
                />
          <h3>Singapore</h3>
          <p>Experience the perfect blend of tradition and modern innovation.</p>
        </div>
      </div>
    </section>
  );
}

export default DestinationHighlights;
