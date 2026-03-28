import './load-env.js';

import cors from 'cors';
import express from 'express';

import youtubeTranscriptRouter from './routes/youtube-transcript.js';

const app = express();
const host = String(process.env.AGENT_HOST || '127.0.0.1').trim() || '127.0.0.1';
const port = Number(process.env.AGENT_PORT ?? process.env.PORT ?? 8080);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'voiceinsight-local-agent',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', youtubeTranscriptRouter);

app.listen(port, host, () => {
  console.log(`[agent] listening on http://${host}:${port}`);
});

