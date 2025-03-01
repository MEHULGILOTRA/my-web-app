import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Header from "./header";
import Footer from "./footer";
import DestinationHighlights from "./DestinationHighlights";
import ContactUs from "./ContactUs";
import GoToTopButton from "./GoToTopButton";
import LandingPageSlider from "./LandingPageSlider";
import ChatbotButton from "./chat_icon";
import SearchResults from "./SearchResults"; // Import Search Results Page

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Landing Page */}
        <Route
          path="/"
          element={
            <>
              <section id="landingpage">
                <Header />
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
        <Route path="/search-results" element={
          <>
                <SearchResults/>
          </>
              }/>

        {/* Redirect any unknown route to the Landing Page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
