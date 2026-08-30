import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { initSockets } from "./sockets";

async function main() {
  await connectDB();

  const app = createApp();
  const httpServer = createServer(app);
  initSockets(httpServer);

  const port = Number(process.env.PORT) || 5000;
  httpServer.listen(port, () => {
    console.log(`[server] JANSEVA HEALTH GRID API listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
