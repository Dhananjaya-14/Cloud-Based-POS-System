# Cloud-Based-POS-System

A Point of Sale (POS) system built with MERN stack, using Neon DB (PostgreSQL) instead of MongoDB.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: Neon DB (PostgreSQL)
- **Authentication**: JWT

## Project Structure

```
Cloud-Based-POS-System/
├── Client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── utils/        # Utility functions
│   │   ├── context/      # React context
│   │   ├── assets/       # Static assets
│   │   ├── App.jsx       # Main App component
│   │   └── main.jsx      # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── Server/                # Express backend
    ├── config/           # Configuration files
    ├── controllers/      # Route controllers
    ├── middleware/       # Custom middleware
    ├── models/           # Database models
    ├── routes/           # API routes
    ├── utils/            # Utility functions
    ├── server.js         # Server entry point
    └── package.json
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Neon DB account and database connection string

### Installation

1. **Install Server Dependencies**
   ```bash
   cd Server
   npm install
   ```

2. **Install Client Dependencies**
   ```bash
   cd Client
   npm install
   ```

3. **Environment Variables**

   **Server (.env)** - Create a `.env` file in the `Server` folder:
   ```
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=your_neon_database_connection_string_here
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   CLIENT_URL=http://localhost:3000
   ```

   **Client (.env)** - Create a `.env` file in the `Client` folder:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application

1. **Start the Server**
   ```bash
   cd Server
   npm run dev
   ```
   Server will run on `http://localhost:5000`

2. **Start the Client**
   ```bash
   cd Client
   npm run dev
   ```
   Client will run on `http://localhost:3000`

## Development

- Server uses `nodemon` for auto-reload during development
- Client uses Vite for fast development and hot module replacement

## Notes

- This is a basic setup. Implementation will be added later.
- Make sure to configure your Neon DB connection string in the Server `.env` file.
