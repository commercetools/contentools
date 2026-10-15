import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadFixture = <T = any>(name: string): T => JSON.parse(readFileSync(join(__dirname, '../fixtures', name), 'utf8'));
