import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";
import { v4 as uuidv4 } from "uuid";
import { searchGameById, getGameEntityId } from "../utils/gameUtils.js";

const createGame = asyncHandler(async (req, res) => {
  let newGame = {
    gameId: uuidv4(),
    players: [],
    host: "",
    questionMaster: "",
    fakeArtist: "",
    currentArtist: "",
    canvasState: "",
    gameState: "inactive",
  };

  await gameRepository.save(newGame);

  res.status(201).json(newGame);
});

const updateGameState = asyncHandler(async (req, res) => {
  let game = await searchGameById(req.params.id);
  
  game.canvasState = req.body.canvasState
  await gameRepository.save(game);

  res.status(201).json(game);
});

const getGameById = asyncHandler(async (req, res, next) => {
  const game = await searchGameById(req.params.id);
  if (!game) {
    res.status(404);
    throw new Error("Game does not exist");
  }

  res.status(201).json(game);
});

const removeGame = asyncHandler(async (req, res) => {
  const gameId = req.params.id;
  const entityId = await getGameEntityId(gameId);

  await gameRepository.remove(entityId);

  res.status(201).json({ gameId });
});

export { createGame, updateGameState, getGameById, removeGame };
