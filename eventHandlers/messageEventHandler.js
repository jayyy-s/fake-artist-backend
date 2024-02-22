import { broadcast, emit } from "../utils/messageSendUtils.js";
import connections from "../connections.js";
import {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
} from "../utils/gameUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const SEND_TO_SENDER = true;

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
        game.players.push(playerId);
        if (game.players.length === 1) {
          // make the first player the host
          game.host = playerId;
          emit(playerId, { type: "setHostClient" });
        }
      }
      await gameRepository.save(game);
      break;
    case "drawLine":
      const { canvasState, gameState } = game;
      broadcast(
        gameId,
        { type: "drawCurrentCanvasState", data: { canvasState, gameState } },
        playerId
      );
      break;
    case "hostStartGame":
      game.gameState = "active";
      await gameRepository.save(game);
      broadcast(gameId, { type: "serverStartGame" }, playerId, SEND_TO_SENDER);
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
