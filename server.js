import express from 'express';
import handler from './api/upscale.js';

const app = express();
const PORT = 3002;

app.post('/api/upscale', (req, res) => handler(req, res));

app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
