
import instagram from '.././images/instagram.svg';
import linkedin from '.././images/linkedin.svg';

// Dictionary with image names and descriptions
const imageLink = {
    instagram : "https://www.instagram.com/skymiles_travels",
    linkedin: "https://www.linkedin.com/company/skymiles-travels/",
};

const imageName = {
    instagram : "Instagram Icon",
    linkedin: "Linkedin Icon",
};

const social_icons = [
  { src: instagram, link: imageLink.instagram, name : imageName.instagram },
  { src: linkedin, link: imageLink.linkedin, name : imageName.linkedin  }
];

export default social_icons;