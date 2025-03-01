import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import Header from "./header";
import Footer from "./footer";
import DestinationHighlights from "./DestinationHighlights";
import ContactUs from "./ContactUs";
import GoToTopButton from "./GoToTopButton";
import LandingPageSlider from "./LandingPageSlider";
import ChatbotButton from "./chat_icon";
import SearchResults from "./SearchResults";

function App() {
  const location = useLocation();

  // Scroll to the section when the location hash changes
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  return (
    <div className="App">
      <Routes>
        {/* Landing Page */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <section id="landingpage">
                <LandingPageSlider />
              </section>
              <main className="main-content">
                <section id="destinations" className="section">
                  <DestinationHighlights />
                </section>
                <section id="contact" className="section">
                  <ContactUs />
                </section>
              </main>
              <Footer />
              <ChatbotButton />
              <GoToTopButton />
            </>
          }
        />

        {/* Search Results Page */}
        <Route
          path="/search-results"
          element={
            <>
              <Header />
              <SearchResults />
              <Footer />
            </>
          }
        />

        {/* Redirect any unknown route to the Landing Page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
