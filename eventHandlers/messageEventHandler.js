import broadcast from "../utils/broadcast.js";
import connections from "../connections.js";
import { searchGameById } from "../utils/gameUtils.js";
import asyncHandler from "express-async-handler";

const handleMessage = asyncHandler(async (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);
  const { canvasState } = game;

  switch (message.type) {
    case "clientReady":
      connections[uuid].gameId = gameId;
    case "drawLine":
      broadcast(
        gameId,
        { type: "drawCurrentCanvasState", data: { canvasState } },
        uuid
      );
      break;
  }
});

const handleClose = (uuid) => {
  delete connections[uuid];
};

export { handleMessage, handleClose };
