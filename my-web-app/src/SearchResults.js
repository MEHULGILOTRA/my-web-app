import React, { useState } from "react";
// import { useLocation } from "react-router-dom";
import "./SearchResults.css";
import packageData from "./datasources/data-packages";
import images from './datasources/data-images-package';

function SearchResults() {
//   const location = useLocation();
//   const params = new URLSearchParams(location.search);
//   const destination = params.get("destination") || "YOUR SELECTED DESTINATION";
  const [expandedPackage, setExpandedPackage] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const packagesArray = Array.isArray(packageData) ? packageData : Object.values(packageData || {});

  const handleDetailClick = (pkg, detail) => {
    setSelectedPackage(pkg);
    setSelectedDetail(detail);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDetail(null);
    setSelectedPackage(null);
  };

  return (
    <div className="search-results luxury-theme">
      <h1 className="search-title">TRAVEL PACKAGES</h1>
      <div className="package-container">
        {packagesArray.length > 0 ? (
          packagesArray.map((pkg, index) => (
            <div key={index} className="package-box">
            <div
                className="image-container"
                style={{
                  backgroundImage: `url(${images[index]?.src})`,
                }}
              ></div>

              <div className="package-card">
                <h2 className="package-title">{pkg?.name?.toUpperCase() || "PACKAGE NAME NOT AVAILABLE"}</h2>
                <button 
                  className="package-button" 
                  onClick={() => setExpandedPackage(expandedPackage === index ? null : index)}
                >
                  {expandedPackage === index ? "HIDE DETAILS" : "MORE DETAILS"}
                </button>
                {expandedPackage === index && (
                  <div className="package-details">
                    <div className="details-list">
                      {["price", "description", "tourHighlights", "itinerary", "accommodationOptions", "inclusions", "exclusions", "termsConditions"].map((detail) => (
                        <div 
                          key={detail} 
                          className="detail-item"
                          onClick={() => handleDetailClick(pkg, detail)}
                        >
                          <span className="arrow">▶</span> {detail === "termsConditions" ? "TERMS AND CONDITIONS" : detail === "tourHighlights" ? "TOUR HIGHLIGHTS" : detail.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>NO TRAVEL PACKAGES AVAILABLE</p>
        )}
      </div>
      {isModalOpen && selectedPackage && selectedDetail && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content luxury-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>
            <div className="modal-details">
              <h2>{selectedDetail === "termsConditions" ? "TERMS AND CONDITIONS" : selectedDetail === "tourHighlights" ? "TOUR HIGHLIGHTS" : selectedDetail.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</h2>
              {selectedDetail === "itinerary" && Array.isArray(selectedPackage[selectedDetail]) ? (
                <ul className="aligned-list">
                  {selectedPackage[selectedDetail].map((item, idx) => (
                    <li key={idx}>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <em>Meals: {item.meals}</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {Array.isArray(selectedPackage[selectedDetail])
                    ? <ul className="aligned-list">{selectedPackage[selectedDetail].map((item, idx) => <li key={idx}>{typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul>
                    : typeof selectedPackage[selectedDetail] === "string" 
                      ? selectedPackage[selectedDetail]
                      : "NO DETAILS AVAILABLE"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchResults;