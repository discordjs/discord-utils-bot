import createLogger from 'pino';
import type { LevelWithSilent } from 'pino';

export function isValidLogLevel(level: string): level is LevelWithSilent {
	return ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(level);
}

export const logger = createLogger();
