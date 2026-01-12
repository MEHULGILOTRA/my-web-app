# Sky Miles Travels

A modern travel booking website built with React.

## Quick Start

### Prerequisites
- Node.js (v16, v18, or v20 recommended)
- npm (comes with Node.js)

### Installation & Running

**Option 1: Use the startup script (Recommended)**

Mac/Linux:
```bash
chmod +x start.sh
./start.sh
```

Windows:
```
start.bat
```

**Option 2: Manual commands**
```bash
npm install
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Clean Installation

If you encounter issues, run:

```bash
chmod +x cleanup.sh
./cleanup.sh
./start.sh
```

Or manually:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm start
```

## Project Structure

```
my-web-app/
├── public/              # Static files
│   ├── index.html
│   └── ...
├── src/                 # Source code
│   ├── components/
│   ├── datasources/
│   ├── images/
│   ├── App.js
│   ├── App.css
│   └── index.js
├── .env                 # Environment variables
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies
└── README.md           # This file
```

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run clean` - Clean and reinstall dependencies

## Features

- 🏖️ Interactive destination slider
- 🔍 Destination search
- 📱 Responsive design
- ⚡ Optimized performance
- 🎨 Modern UI/UX

## Technologies Used

- React 18
- React Router v6
- React Transition Group
- CSS3 with custom animations

## Troubleshooting

### Node.js Version Issues
If using Node.js v22+, the startup script will automatically apply compatibility fixes.

For best results, use Node.js v18 LTS:
```bash
nvm install 18
nvm use 18
```

### Port Already in Use
If port 3000 is busy, the app will prompt to use another port.

### Build Errors
Clear cache and reinstall:
```bash
npm run clean
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
