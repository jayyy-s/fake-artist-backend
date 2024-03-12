import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";
import {
  SEND_TO_SENDER,
  broadcast,
  broadcastCurrentArtist,
  emit,
} from "./messageSendUtils.js";
import { COLOR_COMBOS } from "./miscUtils.js";

const searchGameById = asyncHandler(async (gameId) => {
  if (!gameId) return null;

  let game = await gameRepository
    .search()
    .where("gameId")
    .equals(gameId)
    .return.first();

  return game;
});

const getGameEntityId = asyncHandler(async (gameId) => {
  const game = await searchGameById(gameId);
  const entityIdSymbol = Object.getOwnPropertySymbols(game).find(
    (s) => s.description === "entityId"
  );

  return game[entityIdSymbol];
});

const removePlayerFromGame = asyncHandler(async (gameId, connId) => {
  const game = await searchGameById(gameId);
  if (!game) return null;

  // cycle to next artist if this was the current artist
  if (game.currentArtist === connId) {
    cycleArtist(game, connId);
  }

  const playerToRemoveIndex = indexOfConnId(game.players, connId);
  // add removed player's color back to available pool
  const { colorCombo } = JSON.parse(game.players[playerToRemoveIndex]);
  const colorCode = COLOR_COMBOS.indexOf(colorCombo);
  game.availableColorCodes.push(colorCode);

  game.players.splice(playerToRemoveIndex, 1);

  gameRepository.save(game);
  return game;
});

const indexOfConnId = (players, connIdToFind) => {
  return players.indexOf(players.find((p) => p.includes(connIdToFind)));
};

const getPlayerByConnId = asyncHandler(async (connId, gameId) => {
  const game = await searchGameById(gameId);
  if (!game) return null;
  const player = game.players[indexOfConnId(game.players, connId)];

  return JSON.parse(player);
});

const getPlayers = (game) => {
  let players = [];
  let playersJson = game.players.map((p) => JSON.parse(p));

  playersJson.map((player) =>
    players.push({
      username: player.username,
      id: player.playerId,
      colorCombo: player.colorCombo,
    })
  );

  return players;
};

const endGame = asyncHandler(async (game, connId) => {
  game.gameState = "voting";
  game.currentArtist = "";
  broadcast(game.gameId, { type: "votePhase" }, connId, SEND_TO_SENDER);
  await gameRepository.save(game);
});

const cycleArtist = asyncHandler(async (game, connId) => {
  const { players, gameId } = game;
  // cycle current artist to next player
  const currentIndex = indexOfConnId(players, connId);
  let nextIndex = (currentIndex + 1) % players.length;
  let nextArtistJson = JSON.parse(players[nextIndex]);
  let nextArtist = nextArtistJson.connId;
  // cycle if nextArtist is the question master
  if (nextArtist === game.questionMaster) {
    nextIndex = (nextIndex + 1) % players.length;
    nextArtistJson = JSON.parse(players[nextIndex]);
    nextArtist = nextArtistJson.connId;
  }

  if (nextArtist === game.firstArtist) {
    game.roundCount = game.roundCount + 1;
    if (game.roundCount === game.gameLength) {
      endGame(game), connId;
      return;
    }
  }

  game.currentArtist = nextArtist;
  await gameRepository.save(game);

  // broadcast the next artist
  emit(nextArtist, { type: "drawingTurn" });
  broadcastCurrentArtist(gameId, connId, {
    username: nextArtistJson.username,
    id: nextArtistJson.playerId,
  });
});

export {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
  indexOfConnId,
  getPlayerByConnId,
  getPlayers,
  cycleArtist,
};
