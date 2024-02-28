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

const removePlayerFromGame = asyncHandler(async (gameId, playerId) => {
  const game = await searchGameById(gameId);
  if (!game) return null;
  game.players.splice(indexOfPlayerId(game.players, playerId), 1);

  gameRepository.save(game);
  return game;
});

const indexOfPlayerId = (players, playerIdToFind) => {
  return players.indexOf(players.find((p) => p.includes(playerIdToFind)));
};

export {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
  indexOfPlayerId,
};
