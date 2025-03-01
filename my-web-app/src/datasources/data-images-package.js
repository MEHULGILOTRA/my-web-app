import kashmir1 from '.././images/kashmir1.jpg';
import bangkok1 from '.././images/bangkok1.jpg';
import dubai1 from '.././images/dubai1.jpg';
import singapore1 from '.././images/singapore1.jpg';
import sydney1 from '.././images/clouds-over-the-sydney-opera-house.jpg';
import paris1 from '.././images/paris1.jpg';
import zurich1 from '.././images/zurich1.jpg';
import milan1 from '.././images/milan1.jpg';

// Dictionary with image names and descriptions
const imageDescriptions = {
  kashmir1 : "Mountains",
  bangkok1: "Island",
  dubai1: "Burj Khalifa",
  singapore1: "Marina Bay Sand",
  sydney1 : "Opera House",
  paris1 : "Eiffel Tower",
  zurich1 : "Bridge",
  milan1 : "Brown Horse Statue",
};

// Array of image objects with descriptions
const images = [
  { src: kashmir1, description: imageDescriptions.kashmir1},
  { src: bangkok1, description: imageDescriptions.bangkok1},
  { src: dubai1, description: imageDescriptions.dubai1},
  { src: singapore1, description: imageDescriptions.singapore1},
  { src: sydney1, description: imageDescriptions.sydney1},
  { src: paris1, description: imageDescriptions.paris1},
  { src: zurich1, description: imageDescriptions.zurich1},
  { src: milan1, description: imageDescriptions.milan1},

];

export default images;
