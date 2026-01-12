import React from 'react';
import './Testimonials.css';

function Testimonials() {
  return (
    <section className="testimonials">
      <h2>What Our Clients Say</h2>
      <div className="testimonial-cards">
        <div className="testimonial-card">
          <img src="https://via.placeholder.com/80" alt="Customer 1" />
          <h3>John Doe</h3>
          <p>"The best travel experience of my life. Highly recommend Skymiles!"</p>
        </div>
        <div className="testimonial-card">
          <img src="https://via.placeholder.com/80" alt="Customer 2" />
          <h3>Jane Smith</h3>
          <p>"An unforgettable trip. The team took care of everything!"</p>
        </div>
        <div className="testimonial-card">
          <img src="https://via.placeholder.com/80" alt="Customer 3" />
          <h3>Mark Wilson</h3>
          <p>"I loved every moment of the journey. 5 stars!"</p>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
