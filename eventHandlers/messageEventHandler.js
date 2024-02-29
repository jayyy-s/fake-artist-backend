import { broadcast, emit } from "../utils/messageSendUtils.js";
import connections from "../connections.js";
import {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
  indexOfPlayerId,
  getPlayerUsernames,
} from "../utils/gameUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const SEND_TO_SENDER = true;

const handleMessage = asyncHandler(async (bytes, playerId) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);
  const { canvasState, gameState, players } = game;

  const sendingPlayer = players.find((p) => p.includes(playerId));

  switch (message.type) {
    case "clientReady":
      const { username } = message.data;
      connections[playerId].gameId = gameId;
      if (!game) return; // return on null games (can happen if navigated to invalid id)

      // add player if not already included
      if (!sendingPlayer) {
        const playerToAdd = {
          id: playerId,
          username,
        };

        game.players.push(JSON.stringify(playerToAdd));
        if (game.players.length === 1) {
          // make the first player the host
          game.host = playerId;
          emit(playerId, { type: "setHostClient" });
        }
      }
      broadcast(
        gameId,
        { type: "updatePlayers", data: { players: getPlayerUsernames(game) } }, // Add players
        playerId,
        SEND_TO_SENDER
      );
      await gameRepository.save(game);
      break;
    case "drawLine":
      // cycle current artist to next player
      const currentIndex = indexOfPlayerId(players, playerId);
      const nextIndex = (currentIndex + 1) % players.length;
      const nextArtist = JSON.parse(players[nextIndex]).id;
      game.currentArtist = nextArtist;

      await gameRepository.save(game);

      broadcast(
        gameId,
        { type: "drawCurrentCanvasState", data: { canvasState, gameState } },
        playerId
      );
      emit(nextArtist, { type: "drawingTurn" });
      break;
    case "hostStartGame":
      const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
      const firstArtist = JSON.parse(game.players[randomPlayerIndex]).id;
      game.currentArtist = firstArtist;
      game.gameState = "active";

      await gameRepository.save(game);
      broadcast(gameId, { type: "serverStartGame" }, playerId, SEND_TO_SENDER);
      emit(firstArtist, { type: "drawingTurn" });
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
  } else {
    // if the game still exists, send message to other clients to remove
    broadcast(
      gameId,
      { type: "updatePlayers", data: { players: getPlayerUsernames(game) } }, // Remove players
      playerId
    );
  }
});

export { handleMessage, handleClose };
