export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function logger(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(prefix, message, ...args);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(prefix, message, ...args);
  } else if (level === 'debug') {
    // eslint-disable-next-line no-console
    console.debug(prefix, message, ...args);
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, message, ...args);
  }
} 