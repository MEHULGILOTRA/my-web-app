
import sydney1 from '.././images/clouds-over-the-sydney-opera-house.jpg';
import rome1 from '.././images/rome1.jpg';
import agra1 from '.././images/agra1.jpg';
import china1 from '.././images/china1.jpg';
import rio_de_janeiro1 from '.././images/rio_de_janeiro1.jpg';
import peru1 from '.././images/peru1.jpg';
import petra_jordan1 from '.././images/petra_jordan1.jpg';
import yucatán1 from '.././images/yucatán1.jpg';

// Dictionary with image names and descriptions
const imageDescriptions = {

  sydney1 : "Opera House",
  rome1 : "Colosseum",
  agra1 : "Taj Mahal",
  china1 : "Great Wall of China",
  rio_de_janeiro1 : "Christ the Redeemer",
  peru1 : "Machu Picchu",
  petra_jordan1 : "Petra",
  yucatán1: "Chichén Itzá",
};

// Array of image objects with descriptions
const images = [
  { src: sydney1, description: imageDescriptions.sydney1},
  { src: rome1, description: imageDescriptions.rome1},
  { src: agra1, description: imageDescriptions.agra1},
  { src: china1, description: imageDescriptions.china1},
  { src: rio_de_janeiro1, description: imageDescriptions.rio_de_janeiro1},
  { src: peru1, description: imageDescriptions.peru1},
  { src: petra_jordan1, description: imageDescriptions.petra_jordan1},
  { src: yucatán1, description: imageDescriptions.yucatán1},

];

export default images;
