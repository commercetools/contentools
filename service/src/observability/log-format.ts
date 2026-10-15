import { format } from 'winston';
import { currentCorrelationId } from './request-context';

export const timestampFormat = format.timestamp();

export const correlationFormat = format((info) => {
  const id = currentCorrelationId();
  if (id) {
    info.correlationId = id;
  }
  return info;
})();
