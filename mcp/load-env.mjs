// Loaded FIRST (before lib/db.js) so the Postgres pool sees DATABASE_URL no
// matter what working directory the agent launches the MCP server from.
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
