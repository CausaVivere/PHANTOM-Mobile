import { appRouter } from "./root";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import ws from "ws";
import { createContext } from "./context";
import { createServer } from "https";
import { readFileSync } from "fs";
import { getServerSession } from "next-auth";
import { getServerAuthSession } from "../auth";
import { getSession } from "next-auth/react";
import { ee } from "./routers/user";

const server = createServer({
  cert: readFileSync("certificate path"),
  key: readFileSync("cert key path"),
});
server.listen(3001);

const wss = new ws.Server({
  server: server,
});
const handler = applyWSSHandler({ wss, router: appRouter, createContext });

wss.on("connection", async (ws, req) => {
  const ctx = await getSession({ req: req });
  //@ts-ignore
  ws.id = ctx?.user.id;
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.once("close", async () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
    //@ts-ignore
    ee.emit("disconnect", ws.id);
    //@ts-ignore
    console.log(ws.id);
  });
});
console.log("✅ WebSocket Server listening on ", wss.address() as string);

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});
