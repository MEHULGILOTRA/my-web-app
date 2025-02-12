import imag1 from '.././images/imag1.jpeg';
import imag2 from '.././images/imag2.jpeg';
import imag3 from '.././images/imag3.jpeg';
import imag4 from '.././images/imag4.jpeg';
import imag5 from '.././images/imag5.jpeg';
import imag6 from '.././images/imag6.jpeg';
import imag7 from '.././images/imag7.jpeg';
import imag8 from '.././images/imag8.jpeg';
import australia from '.././images/australia.avif';
import hongkong from '.././images/hong-kong.avif';
import morocco from '.././images/morocco.avif';
import newyork from '.././images/new-york.avif';
import norway from '.././images/norway.avif';
import norway2 from '.././images/norway2.avif';
import spain_madrid from '.././images/spain-madrid.avif';
import south_africa from '.././images/south_africa.avif';
import maldives from '.././images/maldives.webp';
import maldives2 from '.././images/maldives2.avif';

// Dictionary with image names and descriptions
const imageDescriptions = {
  imag1: 'SYDNEY',
  imag2: 'Place 2',
  imag3: 'Place 3',
  imag4: 'Place 4',
  imag5: 'Place 5',
  imag6: 'Place 6',
  imag7: 'Place 7',
  imag8: 'Place 8',
  australia : 'Australia',
  hongkong : 'Hong Kong',
  morocco : 'Morocco',
  newyork : 'New York',
  norway : 'Norway',
  norway2 : 'Norway',
  spain_madrid : 'Madrid (Spain)',
  south_africa : 'South Africa',
  maldives : "Maldives",
  maldives2 : "Maldives",
};

// Array of image objects with descriptions
const images = [
  { src: imag1, description: imageDescriptions.imag1 },
  { src: imag2, description: imageDescriptions.imag2 },
  { src: imag3, description: imageDescriptions.imag3 },
  { src: imag4, description: imageDescriptions.imag4 },
  { src: imag5, description: imageDescriptions.imag5 },
  { src: imag6, description: imageDescriptions.imag6 },
  { src: imag7, description: imageDescriptions.imag7 },
  { src: imag8, description: imageDescriptions.imag8 },
  { src: australia, description: imageDescriptions.australia},
  { src: hongkong, description: imageDescriptions.hongkong},
  { src: morocco, description: imageDescriptions.morocco},
  { src: newyork, description: imageDescriptions.newyork},
  // { src: norway, description: imageDescriptions.norway},
  { src: norway2, description: imageDescriptions.norway2},
  { src: spain_madrid, description: imageDescriptions.spain_madrid},
  { src: south_africa, description: imageDescriptions.south_africa},
  { src: maldives, description: imageDescriptions.maldives},
  { src: maldives2, description: imageDescriptions.maldives2},

];

export default images;
