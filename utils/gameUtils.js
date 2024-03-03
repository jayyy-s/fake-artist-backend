import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

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
  game.players.splice(indexOfConnId(game.players, connId), 1);

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

  playersJson.map((player) => players.push({ username: player.username, id: player.playerId }));

  return players;
};

export {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
  indexOfConnId,
  getPlayerByConnId,
  getPlayers,
};
