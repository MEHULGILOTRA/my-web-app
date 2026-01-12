
import packages from '.././images/packages.jpg';
import bookings from '.././images/bookings.jpg';
import visa from '.././images/visa.jpg';
import itinerary from '.././images/itinerary.jpg';
import group_travel from '.././images/group_travel.jpg';

// Dictionary with image names and descriptions
const imageDescriptions = {
    packages : "International and Domestic Tour Packages",
    bookings: "Flight and Hotel Bookings",
    visa : "Visa and Travel Insurance Assistance",
    itinerary: "Personalized Itineraries",
    group_travel : "Corporate and Group Travel",
};

const imageDescriptionsShort = {
    packages: 'Curated global and local tour experiences.',
    bookings: 'Seamless booking for flights and stays.',
    visa: 'End-to-end visa and insurance support.',
    itinerary: 'Tailored day-by-day travel plans.',
    group_travel: 'Specialized business and group arrangements.'
};


const icons = [
  { src: packages, description: imageDescriptions.packages, shortDesc : imageDescriptionsShort.packages },
  { src: bookings, description: imageDescriptions.bookings, shortDesc : imageDescriptionsShort.pabookingsckages },
  { src: visa, description: imageDescriptions.visa, shortDesc : imageDescriptionsShort.visa },
  { src: itinerary, description: imageDescriptions.itinerary, shortDesc : imageDescriptionsShort.itinerary },
  { src: group_travel, description: imageDescriptions.group_travel, shortDesc : imageDescriptionsShort.group_travel },
];

export default icons;