# Leaf Creme Frontend

Frontend React application for Leaf Creme bakery website.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Router** for navigation

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI primitives (Button, Card, Badge)
│   └── bakery/       # Bakery-specific components (Header, HeroBanner, etc.)
├── pages/            # Page-level containers
├── utils/            # Utility functions (formatPrice, etc.)
├── App.tsx           # Main app component with routing
└── main.tsx          # Entry point
```

## Design System

### Colors
- Background: `#FAFAF7`
- Surface: `#FFFFFF`
- Border: `#E8E5DD`
- Text Primary: `#473C2F`
- Text Secondary: `#7A6F63`
- Accent Yellow: `#F5C96A`
- Accent Pink: `#F7B4B8`
- Accent Brown: `#C59B72`

### Typography
- Headings: Playfair Display (600 weight)
- Body: Inter / Be Vietnam Pro (400/500 weight)

### Spacing
Strict spacing system: 8, 12, 16, 24, 32, 48px

## API Integration

The frontend is configured to proxy API requests to the backend:
- Frontend dev server: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API requests should use `/api/*` which will be proxied to the backend

