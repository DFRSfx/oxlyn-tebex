# Oxlyn Tebex Store

A full-stack e-commerce application for FiveM/CFX resources with Tebex integration, featuring Discord OAuth authentication and an admin dashboard.

## Tech Stack

### Frontend (Client)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v7
- **State Management**: React Context API
- **UI Icons**: Lucide React
- **HTTP Client**: Axios
- **Authentication**: Supabase Auth

### Backend (Server)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT + Discord OAuth
- **Security**: Helmet, CORS, Rate Limiting
- **Session Management**: Express Session with MySQL Store

## Project Structure

```
oxlyn-tebex/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── admin/      # Admin panel pages and components
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Main application pages
│   │   ├── context/    # React contexts
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # API service layer
│   │   ├── utils/      # Helper functions
│   │   ├── config/     # Configuration
│   │   └── types/      # TypeScript definitions
│   └── package.json
│
├── server/             # Backend Express application
│   ├── src/
│   │   ├── config/     # Database configuration
│   │   ├── controllers/# Business logic
│   │   ├── middleware/ # Express middleware
│   │   ├── models/     # Data models
│   │   ├── routes/     # API routes
│   │   ├── types/      # TypeScript definitions
│   │   └── utils/      # Utility functions
│   ├── schema.sql      # Database schema
│   └── package.json
│
└── downloads/          # Runtime generated download files (not in git)
```

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Discord Application (for OAuth)
- Tebex Store Account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/oxlyn-tebex.git
cd oxlyn-tebex
```

### 2. Database Setup

```bash
# Create a MySQL database
mysql -u root -p
CREATE DATABASE oxlyn_tebex;
exit;

# Import the schema
mysql -u root -p oxlyn_tebex < server/schema.sql
```

### 3. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
# - JWT_SECRET, SESSION_SECRET
# - TEBEX_API_KEY (if using Tebex integration)

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

### 4. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your API URL
# VITE_API_URL=http://localhost:3001

# Run in development mode
npm run dev

# Build for production
npm run build
```

### 5. Run Both (Optional)

From the root directory:

```bash
# Install dependencies for both
npm run install:all

# Run both client and server concurrently
npm run dev
```

## Environment Variables

### Server (.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=oxlyn_tebex

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback

# Authentication
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Tebex (optional)
TEBEX_API_KEY=your_tebex_api_key
```

### Client (.env)

```env
VITE_API_URL=http://localhost:3001
```

## Available Scripts

### Root

- `npm run install:all` - Install dependencies for both client and server
- `npm run dev` - Run both client and server in development mode
- `npm run build` - Build both client and server for production

### Client

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Server

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features

- 🛒 Product catalog with categories
- 🔐 Discord OAuth authentication
- 👤 User dashboard with purchase history
- 📥 Digital download management with tokens
- 🎯 Admin panel for:
  - Order management
  - Product management
  - User activity tracking
  - Statistics and analytics
  - Download token generation
- 💳 Tebex integration for payments
- 🔒 Secure JWT-based authentication
- 📊 Real-time statistics
- 🎨 Responsive UI with TailwindCSS

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/admin/*` - Admin panel endpoints (protected)
- `/api/orders/*` - Order management
- `/api/downloads/*` - Download management
- `/api/statistics/*` - Statistics and analytics
- `/api/documentation/*` - Product documentation
- `/api/cfx/*` - CFX.re integration

## Development

The application uses TypeScript throughout. Both client and server have their own TypeScript configurations.

### Code Structure Best Practices

- **Client**: Component-based architecture with clear separation between admin and public pages
- **Server**: MVC pattern with dedicated controllers, routes, and middleware
- **Type Safety**: Shared type definitions in both client and server
- **Security**: Rate limiting, helmet, CORS, and JWT authentication

## Deployment

### Frontend

```bash
cd client
npm run build
# Deploy the 'dist' folder to your hosting service
```

### Backend

```bash
cd server
npm run build
# Deploy the 'dist' folder and run: node dist/index.js
```

## License

ISC

## Author

Oxlyn Software
