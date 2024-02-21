import express from "express";
import http from "http";
import url from "url";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { WebSocketServer } from "ws";
import gameRouter from "./routers/gameRouter.js";
import {
  handleMessage,
  handleClose,
} from "./eventHandlers/messageEventHandler.js";
import connections from "./connections.js";
import asyncHandler from "express-async-handler";
import { errorHandler } from "./middleware/errorMiddleware.js";

const PORT = 5000 || process.env.PORT;

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use("/game", gameRouter);

app.use(errorHandler);

const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  // const { connId } = url.parse(req.url, true).query;
  const playerId = uuidv4();
  connections[playerId] = conn;

  conn.on(
    "message",
    asyncHandler(async (message) => {
      await handleMessage(message, playerId);
    })
  );

  conn.on(
    "close",
    asyncHandler(async () => await handleClose(playerId))
  );
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
