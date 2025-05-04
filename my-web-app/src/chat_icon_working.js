import React, { useState } from "react";
import "./chat_icon.css";

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [userInput, setUserInput] = useState("");
    const [tripType, setTripType] = useState("");
    const [helpType, setHelpType] = useState("");
    const [destination, setDestination] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [tripDays, setTripDays] = useState("");
    const [email, setEmail] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [adultsCount, setAdultsCount] = useState("");
    const [childrenCount, setChildrenCount] = useState("");
    const [hotelCategory, setHotelCategory] = useState("");
    const [budget, setBudget] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [departureLocation, setDepartureLocation] = useState("");
    const [packageDetails, setPackageDetails] = useState("");
    const [whatsappUpdates, setWhatsappUpdates] = useState("");

    const formData = [
        userInput,
        tripType,
        helpType,
        destination,
        departureDate,
        tripDays,
        email,
        contactNumber,
        adultsCount,
        childrenCount,
        hotelCategory,
        budget,
        bookingTime,
        departureLocation,
        packageDetails,
        whatsappUpdates
    ];
    
    const handleOptionClick = (type) => {
        switch (step) {
            case 1:
                console.log("Ques: Are you looking for help in planning your trip?");
                console.log("Ans: " + type);
                setTripType(type);
                break;
            case 2:
                console.log("Ques: What kind of help are you looking for?");
                console.log("Ans: " + type);
                setHelpType(type);
                break;
            case 5:
                console.log("Ques: Is your departure date fixed?");
                console.log("Ans: " + type);
                setDepartureDate(type);
                break;
            case 6:
                console.log("Ques: For how many days will your trip be?");
                console.log("Ans: " + type);
                setTripDays(type);
                break;
            case 7:
                console.log("Ques: Please share your Email ID");
                console.log("Ans: " + type);
                setEmail(type);
                break;
            case 8:
                console.log("Ques: Please confirm your contact number");
                console.log("Ans: " + type);
                setContactNumber(type);
                break;
            case 9:
                console.log("Ques: How many adults (more than 12 yrs) are planning to go?");
                console.log("Ans: " + type);
                setAdultsCount(type);
                break;
            case 10:
                console.log("Ques: How many children (0-12 yrs) are traveling with you?");
                console.log("Ans: " + type);
                setChildrenCount(type);
                break;
            case 11:
                console.log("Ques: What is your preferred hotel category?");
                console.log("Ans: " + type);
                setHotelCategory(type);
                break;
            case 12:
                console.log("Ques: What is the budget of your trip?");
                console.log("Ans: " + type);
                setBudget(type);
                break;
            case 13:
                console.log("Ques: How soon are you going to book the trip?");
                console.log("Ans: " + type);
                setBookingTime(type);
                break;
            case 14:
                console.log("Ques: May I know where you would be leaving from?");
                console.log("Ans: " + type);
                setDepartureLocation(type);
                break;
            case 15:
                console.log("Ques: What do you need in your package?");
                console.log("Ans: " + type);
                setPackageDetails(type);
                break;
            case 16:
                console.log("Ques: Shall we send your trip updates on WhatsApp?");
                console.log("Ans: " + type);
                setWhatsappUpdates(type);
                console.log("Details entered are : ", formData);
                break;
            default:
                break;
        }
        setStep(step + 1);
    };

    const handleInputChange = (e) => setUserInput(e.target.value);

    const handleSubmit = () => {
        if (userInput) {
            switch (step) {
                case 3:
                    console.log("Ques: Where do you want to go?");
                    console.log("Ans: " + userInput);
                    setDestination(userInput);
                    break;
    
                case 4:
                    console.log("Ques: Your trip to " + destination + " sounds exciting!");
                    break;

                case 5:
                    console.log("Ques: Is your departure date fixed?");
                    console.log("Ans: " + userInput);
                    setDepartureDate(userInput);
                    break;
                case 7:
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (emailRegex.test(userInput)) {
                        console.log("Ques: Please share your Email ID");
                        console.log("Ans: " + userInput);
                        setEmail(userInput);
                    } else {
                        alert("Please enter a valid email address.");
                        return; 
                    }
                    break;
    
                case 8:
                    // Mobile number validation (example: 10 digits for Indian numbers)
                    const mobileRegex = /^[6-9]\d{9}$/; // Adjust the regex according to the format required
                    if (mobileRegex.test(userInput)) {
                        console.log("Ques: Please confirm your contact number");
                        console.log("Ans: " + userInput);
                        setContactNumber(userInput);
                    } else {
                        alert("Please enter a valid mobile number.");
                        return; 
                    }
                    break;
    
                case 9:
                    console.log("Ques: How many adults (> 12 yrs) are planning to go?");
                    console.log("Ans: " + userInput);
                    setAdultsCount(userInput);
                    break;
    
                case 10:
                    console.log("Ques: How many children (0-12 yrs) are traveling with you?");
                    console.log("Ans: " + userInput);
                    setChildrenCount(userInput);
                    break;
    
                case 11:
                    console.log("Ques: What is your preferred hotel category?");
                    console.log("Ans: " + userInput);
                    setHotelCategory(userInput);
                    break;
    
                case 12:
                    console.log("Ques: What is the budget of your trip?");
                    console.log("Ans: " + userInput);
                    setBudget(userInput);
                    break;
    
                case 13:
                    console.log("Ques: How soon are you going to book the trip?");
                    console.log("Ans: " + userInput);
                    setBookingTime(userInput);
                    break;
    
                case 14:
                    console.log("Ques: May I know where you would be leaving from?");
                    console.log("Ans: " + userInput);
                    setDepartureLocation(userInput);
                    break;
    
                case 15:
                    console.log("Ques: What do you need in your package?");
                    console.log("Ans: " + userInput);
                    setPackageDetails(userInput);
                    break;
    
                case 16:
                    console.log("Ques: Shall we send your trip updates on WhatsApp?");
                    console.log("Ans: " + userInput);
                    setWhatsappUpdates(userInput);
                    console.log("Details entered are : ", formData);
                    break;
    
                default:
                    break;
            }
            setUserInput(""); // Clear the input field
            setStep(step + 1); // Move to the next step
        }
    };
    

    return (
        <>
            <button className="chatbot-button" onClick={() => setIsOpen(!isOpen)}></button>
            {isOpen && (
                <div className="chatbot-container">
                    <div className="chatbot-header">
                        <span>AI Tour Bot</span>
                        <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
                    </div>
                    <div className="chatbot-content">
                        {step === 1 && (
                            <>
                                <p>Are you looking for help in planning your trip?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("Romantic")}>Yes! A romantic trip</button>
                                    <button onClick={() => handleOptionClick("Family")}>Yes! For a family trip</button>
                                    <button onClick={() => handleOptionClick("Honeymoon")}>Yes! A honeymoon trip</button>
                                    <button onClick={() => handleOptionClick("Friends")}>Yes! For a trip with my friends</button>
                                    <button onClick={() => handleOptionClick("Group")}>For a group trip</button>
                                    <button onClick={() => handleOptionClick("Solo")}>For a solo trip</button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <p>What kind of help are you looking for?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("Destination")}>Help me in deciding my destination</button>
                                    <button onClick={() => handleOptionClick("Budget")}>Calculate budget for my trip</button>
                                    <button onClick={() => handleOptionClick("Package")}>Create best package for my trip</button>
                                    <button onClick={() => handleOptionClick("Activities")}>Plan day to day activity for my trip</button>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <p>Where do you want to go?</p>
                                <div className="chatbot-input-container">
                                    <div className="chatbot-options">
                                    </div>
                                    <input
                                        type="text"
                                        className="chatbot-input"
                                        placeholder="Enter your destination"
                                        value={userInput}
                                        onChange={handleInputChange}
                                    />
                                    <button className="enter-button" onClick={handleSubmit}>✔</button>
                                </div>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <p>Your trip to {destination} sounds exciting!</p>
                                <p>We'll help you with {helpType} for your {tripType} trip!</p>
                                <button className="enter-button" onClick={() => setStep(5)}>Next</button>
                            </>
                        )}

                        {step === 5 && (
                            <>
                                <p>Is your departure date fixed?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("Yes")}>Yes</button>
                                    <button onClick={() => handleOptionClick("No")}>No</button>
                                </div>
                                <div className="chatbot-input-container">
                                    <input
                                        className="chatbot-input"
                                        placeholder="Enter your date"
                                        value={userInput}
                                        onChange={handleInputChange}
                                    />
                                    <button className="enter-button" onClick={handleSubmit}>✔</button>
                                </div>
                            </>
                        )}
                        {step === 6 && (
                            <>
                                <p>For how many days will your trip be?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("3 days or less")}>3 days or less</button>
                                    <button onClick={() => handleOptionClick("4 days")}>4 days</button>
                                    <button onClick={() => handleOptionClick("5 days")}>5 days</button>
                                    <button onClick={() => handleOptionClick("6 days")}>6 days</button>
                                    <button onClick={() => handleOptionClick("7 days or more")}>7 days or more</button>
                                </div>
                            </>
                        )}

                        {step === 7 && (
                            <>
                                <p>Please share your Email ID:</p>
                                <div className="chatbot-input-container">
                                    <input
                                        type="email"
                                        className="chatbot-input"
                                        placeholder="Enter your email"
                                        value={userInput}
                                        onChange={handleInputChange}
                                    />
                                    <button className="enter-button" onClick={handleSubmit}>✔</button>
                                </div>
                            </>
                        )}

                        {step === 8 && (
                            <>
                                <p>Please confirm your contact number:</p>
                                <div className="chatbot-input-container">
                                    <input
                                        type="text"
                                        className="chatbot-input"
                                        placeholder="Enter your contact number"
                                        value={userInput}
                                        onChange={handleInputChange}
                                    />
                                    <button className="enter-button" onClick={handleSubmit}>✔</button>
                                </div>
                            </>
                        )}

                        {step === 9 && (
                            <>
                                <p>How many adults (more than 12 yrs) are planning to go?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("2")}>2</button>
                                    <button onClick={() => handleOptionClick("3")}>3</button>
                                    <button onClick={() => handleOptionClick("4")}>4</button>
                                    <button onClick={() => handleOptionClick("5")}>5</button>
                                    <button onClick={() => handleOptionClick("More than 5")}>More than 5</button>
                                </div>
                            </>
                        )}

                        {step === 10 && (
                            <>
                                <p>How many children (0-12 yrs) are traveling with you?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("0")}>0</button>
                                    <button onClick={() => handleOptionClick("1")}>1</button>
                                    <button onClick={() => handleOptionClick("2")}>2</button>
                                    <button onClick={() => handleOptionClick("3")}>3</button>
                                    <button onClick={() => handleOptionClick("4")}>4</button>
                                    <button onClick={() => handleOptionClick("More than 4")}>More than 4</button>
                                </div>
                            </>
                        )}

                        {step === 11 && (
                            <>
                                <p>What is your preferred hotel category?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("5 star")}>5 star</button>
                                    <button onClick={() => handleOptionClick("4 star")}>4 star</button>
                                    <button onClick={() => handleOptionClick("3 star")}>3 star</button>
                                    <button onClick={() => handleOptionClick("2 star")}>2 star</button>
                                    <button onClick={() => handleOptionClick("Stay not required")}>Stay not required</button>
                                </div>
                            </>
                        )}

                        {step === 12 && (
                            <>
                                <p>What is the budget of your trip? (per person)</p>
                                <div className="chatbot-options">
                                </div>
                                <div className="chatbot-input-container">
                                    <input
                                        type="text"
                                        className="chatbot-input"
                                        placeholder="How much are you feeding the travel piggy bank"
                                        value={userInput}
                                        onChange={handleInputChange}
                                    />
                                    <button className="enter-button" onClick={handleSubmit}>✔</button>
                                </div>
                            </>
                        )}

                        {step === 13 && (
                            <>
                                <p>How soon are you going to book the trip?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("In next 2 - 3 days")}>In next 2 - 3 days</button>
                                    <button onClick={() => handleOptionClick("In this week")}>In this week</button>
                                    <button onClick={() => handleOptionClick("In this month")}>In this month</button>
                                    <button onClick={() => handleOptionClick("Later sometime")}>Later sometime</button>
                                </div>
                            </>
                        )}

                        {step === 14 && (
                            <>
                                <p>May I know where you would be leaving from?</p>
                                <div className="chatbot-input-container">
                                    <input
                                        type="text"
                                        className="chatbot-input"
                                        placeholder="What is your base location?"
                                        value={userInput}
                                        onChange={handleInputChange}
                                    />
                                    <button className="enter-button" onClick={handleSubmit}>✔</button>
                                </div>
                            </>
                        )}

                        {step === 15 && (
                            <>
                                <p>What do you need in your package?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("Hotels Only")}>Hotels Only</button>
                                    <button onClick={() => handleOptionClick("Hotels + Private Cab")}>Hotels + Private Cab</button>
                                    <button onClick={() => handleOptionClick("Hotels + Private Cab + Flights")}>Hotels + Private Cab + Flights</button>
                                    <button onClick={() => handleOptionClick("Hotels + Flights")}>Hotels + Flights</button>
                                </div>
                            </>
                        )}

                        {step === 16 && (
                            <>
                                <p>Shall we send your trip updates on WhatsApp?</p>
                                <div className="chatbot-options">
                                    <button onClick={() => handleOptionClick("Yes")}>Yes</button>
                                    <button onClick={() => handleOptionClick("No")}>No</button>
                                </div>
                            </>
                        )}

                        {step === 17 && (
                            <>
                                <p>Your response has been recorded! An agent will get in touch with you soon.</p>
                                <p>Thank you for choosing Skymiles Travels!!!</p>
                                
                            </>
                        )}

                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
