import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'analytics.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function timestamp(): string {
  return new Date().toISOString();
}

function write(message: string): void {
  const line = `[${timestamp()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

export const analyticsLogger = {
  log(message: string, data?: any): void {
    if (data !== undefined) {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      write(`${message}\n${serialized}`);
    } else {
      write(message);
    }
  },
};
