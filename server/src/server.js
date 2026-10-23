import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import productsRouter from './routes/products.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'BikeParts Manager API' }));
app.use('/api/products', productsRouter);
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.name === 'ValidationError') return res.status(400).json({ message: error.message });
  res.status(500).json({ message: 'Unexpected server error' });
});

connectDB()
  .then(() => app.listen(port, () => console.log(`BikeParts Manager API listening on http://localhost:${port}`)))
  .catch(error => { console.error('Failed to start API:', error.message); process.exit(1); });
