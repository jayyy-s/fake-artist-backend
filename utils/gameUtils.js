import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const searchGameById = asyncHandler(async (gameId) => {
  let game = await gameRepository.search()
    .where("gameId")
    .equals(gameId).return.first();

  return game;
});

export { searchGameById };