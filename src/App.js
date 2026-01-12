import React, { useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import Header from "./header";
import Footer from "./footer";
import DestinationHighlights from "./DestinationHighlights";
import AboutUs from "./AboutUs";
import GoToTopButton from "./GoToTopButton";
import LandingPageSlider from "./LandingPageSlider";
import ChatbotButton from "./chat_icon";
import SearchResults from "./SearchResults";

function App() {
  const location = useLocation();

  const scrollToSection = useCallback(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "auto" });
      }
    }
  }, [location.hash]);

  useEffect(() => {
    scrollToSection();
  }, [scrollToSection]);

  return (
    <div className="App">
      <Routes>
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
                <section id="about-us" className="section">
                  <AboutUs />
                </section>
              </main>
              <Footer />
              <ChatbotButton />
              <GoToTopButton />
            </>
          }
        />

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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
