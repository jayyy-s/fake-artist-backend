import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";
import { v4 as uuidv4 } from "uuid";
import { searchGameById } from "../utils/gameUtils.js";

const createGame = asyncHandler(async (req, res) => {
  let newGame = {
    gameId: uuidv4(),
    canvasState: "",
  };

  await gameRepository.save(newGame);

  res.status(201).json(newGame);
});

const updateGameState = asyncHandler(async (req, res) => {
  let game = await searchGameById(req.params.id);
  game.canvasState = req.body.canvasState;
  await gameRepository.save(game);

  res.status(201).json(game);
});

const getGameById = asyncHandler(async (req, res) => {
  const game = await searchGameById(req.params.id);

  res.status(201).json(game);
});

export { createGame, updateGameState, getGameById };
