export const getLocalStorage = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    if (!window.localStorage.getItem('assistants')) window.localStorage.setItem('assistants', JSON.stringify(defaultAssistants));
    return window.localStorage.getItem(key);
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return null;
  }
};

export const setLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error setting localStorage:', e);
  }
};

const defaultAssistants = [
  {
    "id": "1738013093908",
    "name": "Product Research",
    "icon": { "label": "bulb", "value": "bulb", "icon": "bulb" },
    "instructions": "Your role is to gather relevant information, understand user needs, and identify market trends. You should explore competitors, analyze user feedback, and provide recommendations for product features or improvements",
    "color": { "label": "blue", "value": "blue", "color": "bg-blue-500" }
  },
  {
    "id": "1738013136660",
    "name": "UX/UI Designer",
    "icon": { "label": "brush", "value": "brush", "icon": "brush" },
    "instructions": "Your role is to design user interfaces that are intuitive, simple, and visually appealing. Focus on creating wireframes, mockups, and prototypes that prioritize user experience while keeping in mind the product’s goals.",
    "color": { "label": "pink", "value": "pink", "color": "bg-pink-500" }
  },
  {
    "id": "1738013169595",
    "name": "Developer",
    "icon": { "label": "code", "value": "code", "icon": "code" },
    "instructions": "Your role is to transform ideas into functional code. Build scalable, efficient, and maintainable software using the appropriate technologies. Focus on delivering high-quality, bug-free solutions that meet the product’s requirements.\nAlways provide code in NextJS14",
    "color": { "label": "orange", "value": "orange", "color": "bg-orange-500" }
  },
  {
    "id": "1738013634419",
    "name": "QA Specialist",
    "icon": { "label": "hammer", "value": "hammer", "icon": "hammer" },
    "instructions": "Your role is to ensure the product meets the highest quality standards. Test for bugs, security vulnerabilities, performance issues, and usability flaws. Provide detailed reports and work with the development team to fix problems.",
    "color": { "label": "red", "value": "red", "color": "bg-red-500" }
  },
  {
    "id": "1738013701443",
    "name": "Product Manager",
    "icon": { "label": "star", "value": "star", "icon": "star" },
    "instructions": "Your role is to oversee the product development process from concept to launch. Coordinate between the team, define product vision, prioritize features, and ensure deadlines and goals are met. Make data-driven decisions to achieve the product's objectives.",
    "color": { "label": "yellow", "value": "yellow", "color": "bg-yellow-500" }
  }
];