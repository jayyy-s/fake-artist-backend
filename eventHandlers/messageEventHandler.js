import broadcast from "../utils/broadcast.js";
import connections from "../connections.js";
import {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
} from "../utils/gameUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const handleMessage = asyncHandler(async (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);

  switch (message.type) {
    case "clientReady":
      connections[uuid].gameId = gameId;
      if (!game) return; // return on null games (can happen if navigated to invalid id)

      // add player if not already included
      if (!game.players.includes(uuid)) {
        game.players.push(uuid);
      }
      await gameRepository.save(game);
    case "drawLine":
      const { canvasState } = game;
      broadcast(
        gameId,
        { type: "drawCurrentCanvasState", data: { canvasState } },
        uuid
      );
      break;
  }
});

const handleClose = asyncHandler(async (uuid) => {
  const { gameId } = connections[uuid];
  const game = await removePlayerFromGame(gameId, uuid);
  delete connections[uuid];

  // delete games with no players
  if (game && game.players.length === 0) {
    const entityId = await getGameEntityId(gameId);
    await gameRepository.remove(entityId);
  }
});

export { handleMessage, handleClose };
