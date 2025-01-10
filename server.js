import express, { json } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import cryptoRoutes from './src/routes';

config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(json());

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ status: "healthy", message: "Crypto API is running" });
});

app.use('/api/v1/crypto', cryptoRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Server setup
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;
