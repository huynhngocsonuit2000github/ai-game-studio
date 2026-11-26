import { cp, rm } from 'node:fs/promises';
import { URL } from 'node:url';

const assembled = new URL('../../../deployment/dist/', import.meta.url);
const privateSite = new URL('../test-results/campaign-site/dist/', import.meta.url);
await rm(privateSite, { recursive: true, force: true });
await cp(assembled, privateSite, { recursive: true });
