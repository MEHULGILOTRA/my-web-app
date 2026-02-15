import React, { useState } from "react";
import "./chat_icon.css";
import { sendContactFormEmails } from "./emailServiceClient";

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [userInput, setUserInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [responses, setResponses] = useState([]);
    const [formData, setFormData] = useState({
        tripType: "",
        helpType: "",
        destination: "",
        departureDate: "",
        tripDays: "",
        email: "",
        contactNumber: "",
        adultsCount: "",
        childrenCount: "",
        hotelCategory: "",
        budget: "",
        bookingTime: "",
        departureLocation: "",
        packageDetails: "",
        whatsappUpdates: ""
    });

    const questions = {
        1: "Are you looking for help in planning your trip?",
        2: "What kind of help are you looking for?",
        3: "Where do you want to go?",
        4: `Your trip to ${formData.destination} sounds exciting!`,
        5: "Is your departure date fixed?",
        6: "For how many days will your trip be?",
        7: "Please share your Email ID",
        8: "Please confirm your contact number",
        9: "How many adults (more than 12 yrs) are planning to go?",
        10: "How many children (0-12 yrs) are traveling with you?",
        11: "What is your preferred hotel category?",
        12: "What is the budget of your trip?",
        13: "How soon are you going to book the trip?",
        14: "May I know where you would be leaving from?",
        15: "What do you need in your package?",
        16: "Shall we send your trip updates on WhatsApp?"
    };

    const handleSendEmail = async () => {
        setIsOpen(false);

        // Format responses into a readable message
        const formattedMessage = responses.join('\n');
        const userName = formData.email.split('@')[0] || 'Traveler';

        try {
            const result = await sendContactFormEmails(
                userName,
                formData.email,
                `Chatbot Query Submission:\n\n${formattedMessage}`
            );

            if (result.success) {
                alert('Thank you! Your travel requirements have been recorded. Check your email for confirmation.');
            } else {
                alert('Failed to send your query. Please check your EmailJS configuration.');
            }
        } catch (error) {
            alert('Failed to send your query. Please try again or contact us directly.');
        }

        // Reset form
        setStep(1);
        setFormData({
            tripType: "", helpType: "", destination: "", departureDate: "",
            tripDays: "", email: "", contactNumber: "", adultsCount: "",
            childrenCount: "", hotelCategory: "", budget: "", bookingTime: "",
            departureLocation: "", packageDetails: "", whatsappUpdates: ""
        });
        setResponses([]);
        setErrorMessage("");
    };

    const handleOptionClick = (value) => {
        const fieldNames = [
            "tripType", "helpType", "destination", "destination",
            "departureDate", "tripDays", "email", "contactNumber",
            "adultsCount", "childrenCount", "hotelCategory", "budget",
            "bookingTime", "departureLocation", "packageDetails", "whatsappUpdates"
        ];

        const field = fieldNames[step - 1];

        setResponses(prev => [...prev, `Ques: ${questions[step]}\nAns: ${value}\n`]);
        setFormData(prev => ({ ...prev, [field]: value }));
        setStep(prev => prev + 1);
        setErrorMessage("");
    };

    const handleInputChange = (e) => {
        setUserInput(e.target.value);
        setErrorMessage("");
    };

    const handleSubmit = () => {
        if (!userInput.trim()) {
            setErrorMessage("Please enter a value");
            return;
        }

        if (step === 7 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput)) {
            setErrorMessage("Please enter a valid email address");
            return;
        }

        if (step === 8 && !/^[6-9]\d{9}$/.test(userInput)) {
            setErrorMessage("Please enter a valid 10-digit mobile number starting with 6-9");
            return;
        }

        setErrorMessage("");
        handleOptionClick(userInput);
        setUserInput("");
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
            setResponses(prev => prev.slice(0, -1));
            setErrorMessage("");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <>
            <button className="chatbot-button" onClick={() => setIsOpen(!isOpen)}></button>
            {isOpen && (
                <div className="chatbot-container">
                    <div className="chatbot-header">
                        <div className="header-left">
                            {step > 1 && step < 17 && (
                                <button className="back-button" onClick={handleBack}>← Back</button>
                            )}
                        </div>
                        <span>AI Tour Bot</span>
                        <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
                    </div>
                    <div className="chatbot-content">
                        {/* Progress Bar */}
                        <div className="chatbot-progress">
                            <div
                                className="chatbot-progress-bar"
                                style={{ width: `${(step / 17) * 100}%` }}
                            />
                        </div>

                        <p className="chatbot-question">{questions[step]}</p>

                        {step === 3 || step === 7 || step === 8 || step === 12 || step === 14 ? (
                            <div className="chatbot-input-container">
                                <input
                                    type={step === 7 ? "email" : step === 8 ? "tel" : "text"}
                                    className="chatbot-input"
                                    placeholder="Enter your response"
                                    value={userInput}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                />
                                <button className="enter-button" onClick={handleSubmit}>✔</button>
                            </div>
                        ) : (
                            <div className="chatbot-options">
                                {step === 1 && ["Romantic", "Family", "Honeymoon", "Friends", "Group", "Solo"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 2 && ["Destination", "Budget", "Package", "Activities"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>Help me with {option}</button>
                                ))}
                                {step === 4 && ["Enter"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 5 && ["Yes", "No"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 6 && ["3 days or less", "4 days", "5 days", "6 days", "7 days or more"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 9 && ["2", "3", "4", "5", "More than 5"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 10 && ["0", "1", "2", "3", "4", "More than 4"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 11 && ["5 star", "4 star", "3 star", "2 star", "Stay not required"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 13 && ["In next 2 - 3 days", "In this week", "In this month", "Later sometime"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 15 && ["Hotels Only", "Hotels + Private Cab", "Hotels + Private Cab + Flights", "Hotels + Flights"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 16 && ["Yes", "No"].map(option => (
                                    <button key={option} onClick={() => handleOptionClick(option)}>{option}</button>
                                ))}
                                {step === 17 && (
                                    <div className="chatbot-confirmation">
                                        <div className="confirmation-icon">✓</div>
                                        <h3>Almost Done!</h3>
                                        <p>We've recorded all your preferences. Click submit to send your travel requirements to our team.</p>
                                        <p className="confirmation-note">You'll receive a confirmation email at <strong>{formData.email}</strong></p>
                                        <button onClick={handleSendEmail} className="submit-final-button">
                                            Submit My Requirements
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {errorMessage && (
                            <p className="error-message">{errorMessage}</p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
