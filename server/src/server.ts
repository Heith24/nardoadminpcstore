import { app } from './app.js';
import { createPool } from './config/database.js';
import { env } from './config/env.js';

try {
	await createPool();
	app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
} catch (error) {
	console.error('Could not connect to SQL Server. Check the SQL Server service and server/.env settings.', error);
	process.exitCode = 1;
}
