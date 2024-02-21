import broadcast from "../utils/broadcast.js";
import connections from "../connections.js";
import {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
} from "../utils/gameUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const handleMessage = asyncHandler(async (bytes, playerId) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);

  switch (message.type) {
    case "clientReady":
      connections[playerId].gameId = gameId;
      if (!game) return; // return on null games (can happen if navigated to invalid id)

      // add player if not already included
      if (!game.players.includes(playerId)) {
        if (game.players.length === 0) { // make the first player the host
          game.host = playerId;
        }
        game.players.push(playerId);
      }
      await gameRepository.save(game);
    case "drawLine":
      const { canvasState } = game;
      broadcast(
        gameId,
        { type: "drawCurrentCanvasState", data: { canvasState } },
        playerId
      );
      break;
  }
});

const handleClose = asyncHandler(async (playerId) => {
  const { gameId } = connections[playerId];
  const game = await removePlayerFromGame(gameId, playerId);
  delete connections[playerId];

  // delete games with no players
  if (game && (game.players.length === 0 || playerId === game.host)) {
    const entityId = await getGameEntityId(gameId);
    await gameRepository.remove(entityId);
  }
});

export { handleMessage, handleClose };
