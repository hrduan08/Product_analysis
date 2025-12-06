import app from './app.js';
import { initScheduledJobs } from './jobs/scheduler.js';

const PORT = Number(process.env.PORT ?? 8080);

const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

initScheduledJobs();

export default server;
