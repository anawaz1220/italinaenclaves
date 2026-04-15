import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import churchesRouter from './routes/churches.js';
import enclavesRouter from './routes/enclaves.js';
import adminRouter from './routes/admin.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/churches', churchesRouter);
app.use('/api/enclaves', enclavesRouter);
app.use('/api/admin', adminRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
