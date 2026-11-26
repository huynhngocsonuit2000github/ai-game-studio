import { cp, mkdir } from 'node:fs/promises';
import { URL } from 'node:url';

const assembled = new URL('../../../deployment/dist/', import.meta.url);
const privateSite = new URL('../test-results/campaign-site/dist/', import.meta.url);
await mkdir(privateSite, { recursive: true });
await cp(assembled, privateSite, { recursive: true });
