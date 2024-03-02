import {
  broadcast,
  emit,
  broadcastCurrentArtist,
  SEND_TO_SENDER,
} from "../utils/messageSendUtils.js";
import connections from "../connections.js";
import {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
  indexOfConnId,
  getPlayers,
} from "../utils/gameUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const handleMessage = asyncHandler(async (bytes, connId) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);
  const { canvasState, gameState, players } = game;

  const sendingPlayer = players.find((p) => p.includes(connId));

  switch (message.type) {
    case "clientReady":
      const { username } = message.data;
      connections[connId].gameId = gameId;
      if (!game) return; // return on null games (can happen if navigated to invalid id)

      // add player if not already included
      if (!sendingPlayer) {
        const playerToAdd = {
          connId, // Used only by server/DB to broadcast/track player states
          playerId: game.playerIdCounter, // Used to send information about other clients to client
          username,
        };

        game.playerIdCounter = game.playerIdCounter + 1; // Increment id counter to give next player id unique to game

        game.players.push(JSON.stringify(playerToAdd));
        if (game.players.length === 1) {
          // make the first player the host
          game.host = connId;
          emit(connId, { type: "setHostClient" });
        }
      }

      // Inform the other clients of new player
      broadcast(
        gameId,
        { type: "updatePlayers", data: { players: getPlayers(game) } },
        connId,
        SEND_TO_SENDER
      );
      await gameRepository.save(game);
      break;
    case "drawLine":
      // cycle current artist to next player
      const currentIndex = indexOfConnId(players, connId);
      const nextIndex = (currentIndex + 1) % players.length;
      const nextArtistJson = JSON.parse(players[nextIndex]);
      const nextArtist = nextArtistJson.connId;
      game.currentArtist = nextArtist;

      await gameRepository.save(game);

      broadcast(
        gameId,
        { type: "drawCurrentCanvasState", data: { canvasState, gameState } },
        connId
      );
      emit(nextArtist, { type: "drawingTurn" });
      broadcastCurrentArtist(gameId, connId, {
        username: nextArtistJson.username,
        id: nextArtistJson.playerId,
      });
      break;
    case "hostStartGame":
      const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
      const firstArtistJson = JSON.parse(game.players[randomPlayerIndex]);
      const firstArtist = firstArtistJson.connId;
      game.currentArtist = firstArtist;
      game.gameState = "active";

      await gameRepository.save(game);
      broadcast(gameId, { type: "serverStartGame" }, connId, SEND_TO_SENDER);
      // Inform all players of current artist
      broadcastCurrentArtist(gameId, connId, {
        username: firstArtistJson.username,
        id: firstArtistJson.playerId,
      });
      emit(firstArtist, { type: "drawingTurn" });
      break;
  }
});

const handleClose = asyncHandler(async (connId) => {
  const { gameId } = connections[connId];
  const game = await removePlayerFromGame(gameId, connId);
  delete connections[connId];

  if (!game) return;

  // delete games with no players
  if (game.players.length === 0 || connId === game.host) {
    const entityId = await getGameEntityId(gameId);
    await gameRepository.remove(entityId);
  } else {
    // if the game still exists, send message to other clients to remove
    broadcast(
      gameId,
      { type: "updatePlayers", data: { players: getPlayers(game) } }, // Remove players
      connId
    );
  }
});

export { handleMessage, handleClose };
