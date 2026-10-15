import { Writable } from 'node:stream';
import { transports } from 'winston';
import { resetConfigurationForTests } from '../../src/config/env';
import { getLogger, resetLoggerForTests } from '../../src/utils/logger.utils';

export interface LogCapture {
  /** Every captured log line, parsed. */
  records: () => Record<string, unknown>[];
  text: () => string;
  stop: () => void;
}

/** Runs `fn` with LOG_LEVEL set; the capture sees every line the logger emits at that level. */
export async function withLogs(
  level: 'error' | 'warn' | 'info' | 'debug',
  fn: (capture: LogCapture) => Promise<void>
): Promise<void> {
  const original = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  resetConfigurationForTests();
  resetLoggerForTests();
  const chunks: string[] = [];
  const sink = new transports.Stream({
    stream: new Writable({
      write(chunk, _enc, done) {
        chunks.push(String(chunk));
        done();
      },
    }),
  });
  const logger = getLogger();
  logger.add(sink);
  const capture: LogCapture = {
    text: () => chunks.join(''),
    records: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Record<string, unknown>),
    stop: () => {
      logger.remove(sink);
    },
  };
  try {
    await fn(capture);
    await new Promise((resolve) => setTimeout(resolve, 30));
  } finally {
    capture.stop();
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
    resetConfigurationForTests();
    resetLoggerForTests();
  }
}
