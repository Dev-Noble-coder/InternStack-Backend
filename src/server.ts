import { createApp } from './app';
import { connectDatabase } from './db';
import { config } from './config';

async function start(): Promise<void> {
  await connectDatabase();
  createApp().listen(config.PORT, () => console.log(`InternStack API listening on ${config.PORT}`));
}
start().catch((error) => { console.error(error); process.exit(1); });