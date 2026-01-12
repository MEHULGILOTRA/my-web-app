import React from 'react';
import './ExclusivePackages.css';

function ExclusivePackages() {
  return (
    <section className="exclusive-packages">
      <h2>Exclusive Travel Packages</h2>
      <div className="packages">
        <div className="package-card">
          <h3>Romantic Getaway</h3>
          <p>Paris, Venice, and Rome. The perfect romantic escape for two.</p>
          <button className="button">Book Now</button>
        </div>
        <div className="package-card">
          <h3>Luxury Beach Escape</h3>
          <p>The Maldives & Bora Bora. Pure luxury by the sea.</p>
          <button className="button">Book Now</button>
        </div>
        <div className="package-card">
          <h3>Adventure Awaits</h3>
          <p>Explore the wild side of New Zealand and Fiji.</p>
          <button className="button">Book Now</button>
        </div>
      </div>
    </section>
  );
}

export default ExclusivePackages;
