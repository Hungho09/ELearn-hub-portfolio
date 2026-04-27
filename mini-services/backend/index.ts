import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pythonProcess = spawn('python3', [
  '-m', 'uvicorn',
  'main:app',
  '--host', '0.0.0.0',
  '--port', '3001',
  '--reload',
], {
  cwd: __dirname,
  stdio: 'inherit',
});

pythonProcess.on('error', (err) => {
  console.error('[learnhub-backend] Failed to start Python service:', err);
  process.exit(1);
});

pythonProcess.on('exit', (code) => {
  console.error(`[learnhub-backend] Python service exited with code ${code}`);
  process.exit(code || 1);
});

process.on('SIGINT', () => {
  pythonProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  pythonProcess.kill('SIGTERM');
  process.exit(0);
});
