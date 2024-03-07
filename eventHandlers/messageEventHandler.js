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
  getPlayers,
  cycleArtist,
} from "../utils/gameUtils.js";
import { randomColor } from "../utils/miscUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const handleMessage = asyncHandler(async (bytes, connId) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);

  const sendingPlayer = game.players.find((p) => p.includes(connId));

  switch (message.type) {
    case "clientReady":
      const { username } = message.data;
      connections[connId].gameId = gameId;
      if (!game) return; // return on null games (can happen if navigated to invalid id)
      const playerColor = randomColor(game.availableColors);
      // add player if not already included
      if (!sendingPlayer) {
        // remove new color from available colors
        game.availableColors.splice(
          game.availableColors.indexOf(playerColor),
          1
        );

        const playerToAdd = {
          connId, // Used only by server/DB to broadcast/track player states
          playerId: game.playerIdCounter, // Used to send information about other clients to client
          username,
          color: playerColor,
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
      // Tell player their own color
      emit(connId, { type: "setPlayerColor", data: { color: playerColor } });
      await gameRepository.save(game);
      break;
    case "drawLine":
      if (game.gameState === "active") {
        cycleArtist(game, connId);
        const { canvasState } = game;
        broadcast(
          gameId,
          { type: "drawCurrentCanvasState", data: { canvasState } },
          connId
        );
      }
      break;
    case "hostStartGame":
      if (game.players.length < 4) {
        // Don't allow games to start with less than 4 players
        emit(connId, { type: "notEnoughPlayers" });
        break;
      }

      const questionMasterIndex = Math.floor(
        Math.random() * game.players.length
      );
      let fakeArtistIndex = Math.floor(Math.random() * game.players.length);

      while (fakeArtistIndex === questionMasterIndex) {
        // regenerate if both indicies are equal
        // could technically be optimized to not generate the same number more than once
        fakeArtistIndex = Math.floor(Math.random() * game.players.length);
      }

      // set question master
      const questionMasterJson = JSON.parse(game.players[questionMasterIndex]);
      const questionMaster = questionMasterJson.connId;
      game.questionMaster = questionMaster;

      // set fake artist
      const fakeArtistJson = JSON.parse(game.players[fakeArtistIndex]);
      const fakeArtist = fakeArtistJson.connId;
      game.fakeArtist = fakeArtist;
      game.gameState = "active";

      await gameRepository.save(game);
      broadcast(
        gameId,
        {
          type: "serverStartGame",
          data: {
            questionMaster: {
              username: questionMasterJson.username,
              id: questionMasterJson.playerId,
            },
          },
        },
        connId,
        SEND_TO_SENDER
      );
      emit(questionMaster, { type: "promptQuestionMaster" });
      break;
    case "setPrompt":
      let randomPlayerIndex = Math.floor(Math.random() * game.players.length);
      let firstArtistJson = JSON.parse(game.players[randomPlayerIndex]);

      while (firstArtistJson.connId === game.questionMaster) {
        randomPlayerIndex = Math.floor(Math.random() * game.players.length);
        firstArtistJson = JSON.parse(game.players[randomPlayerIndex]);
      }

      const firstArtist = firstArtistJson.connId;
      game.currentArtist = firstArtist;
      game.firstArtist = firstArtist;
      const { category, title } = game;

      await gameRepository.save(game);
      // SMELL: Two broadcasts seems odd?...maybe change to single message w/ cat, title, first artist
      // Inform all players except fake artist of category + title
      broadcast(
        gameId,
        {
          type: "setPrompt",
          data: { category, title },
        },
        game.fakeArtist
      );
      emit(game.fakeArtist, {
        type: "setPrompt",
        data: { category, title: "???" },
      });
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

  // lil null checky
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
