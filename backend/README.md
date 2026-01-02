# FinSathi Backend

This is the backend service for FinSathi, built with Node.js, Express, and Supabase.

## Project Structure

The project follows a systematic MVC-like structure within `src`:

- **src/config**: Configuration files (Database connection, etc.)
- **src/controllers**: Logic for handling API requests.
- **src/routes**: API route definitions mapping to controllers.
- **src/services**: Business logic and external service integrations (e.g., EmailService).
- **src/middleware**: Express middlewares.
- **src/utils**: Utility functions.
- **src/server.js**: Entry point of the application.

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Setup Environment Variables:
    Create a `.env` file in the root directory (see `.env.example` if available).

3.  Run the server:
    - Development: `npm run dev`
    - Production: `npm start`

## API Endpoints

(See `src/routes` for detailed endpoint definitions)
