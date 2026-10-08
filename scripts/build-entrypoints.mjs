import { writeFile } from 'node:fs/promises';

// Share the CommonJS implementation so mixed import/require consumers use the same classes.
await writeFile(new URL('../dist/index.mjs', import.meta.url), `import api from './index.js';
export const { RiotAPI, DataDragon, RiotAPIError, RIOT_ENDPOINTS } = api;
export default api;
`);
await writeFile(new URL('../dist/index.d.mts', import.meta.url), "import * as api from './index.js';\nexport * from './index.js';\nexport default api;\n");
