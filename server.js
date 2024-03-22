import express from "express";
import http from "http";
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
import cors from "cors";

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
};

app.use(express.json());

if (process.env.ENVIRONMENT === "development") {
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGIN,
  };
  app.use(cors(corsOptions));
}

app.use("/game", gameRouter);

app.use(errorHandler);

const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  const connId = uuidv4();
  connections[connId] = conn;

  conn.on(
    "message",
    asyncHandler(async (message) => {
      await handleMessage(message, connId);
    })
  );

  conn.on(
    "close",
    asyncHandler(async () => await handleClose(connId))
  );
});

if (process.env.ENVIRONMENT === "development") {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  server.listen(PORT, "0.0.0.0");
}
