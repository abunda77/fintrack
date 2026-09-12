import { createApp } from "./app";
import { migrate, seedIfEmpty } from "./db";

const PORT = Number(process.env.PORT || 3001);

migrate();
seedIfEmpty();

const app = createApp();
const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`FinTrack API berjalan di http://localhost:${PORT}`);
});

function shutdown(): void {
  // eslint-disable-next-line no-console
  console.log("\nMenutup server...");
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);