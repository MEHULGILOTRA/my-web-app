import React from 'react';
import './App.css';
import Header from './header';
import Footer from './footer';
import DestinationHighlights from './DestinationHighlights';
import ExclusivePackages from './ExclusivePackages';
import Testimonials from './Testimonials';
import OurTeam from './OurTeam';
import ContactUs from './ContactUs';

function App() {
  return (
    <div className="App">
      <Header />
      <main className="main-content">
        <section className="section">
          <h2>Your Dream Vacation Awaits</h2>
          <p>Explore the world's most luxurious destinations with us.</p>
          <div>
          <button className="button">Discover More</button>
          </div>
        </section>
        <section className="section">
          <DestinationHighlights />
        <ExclusivePackages />
        <Testimonials />
        <OurTeam />
        <ContactUs />

          <h2>Why Choose Us?</h2>
          <p>Experience the finest services, hand-picked tours, and expert guides.</p>
          <button className="button">Learn More</button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default App;
