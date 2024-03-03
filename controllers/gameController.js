import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";
import { v4 as uuidv4 } from "uuid";
import {
  searchGameById,
  getGameEntityId,
  getPlayerByConnId,
  getPlayers,
} from "../utils/gameUtils.js";

const formatPlayerData = asyncHandler(async (game) => {
  if (game.currentArtist) {
    const currentArtist = await getPlayerByConnId(
      game.currentArtist,
      game.gameId
    );

    game.currentArtist = {
      username: currentArtist.username,
      id: currentArtist.playerId,
    };
  }

  if (game.players) game.players = getPlayers(game);

  return game;
});

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
    playerIdCounter: 0,
  };

  await gameRepository.save(newGame);

  res.status(201).json(newGame);
});

const updateGameState = asyncHandler(async (req, res) => {
  let game = await searchGameById(req.params.id);

  game.canvasState = req.body.canvasState;
  await gameRepository.save(game);

  game = await formatPlayerData(game);

  res.status(201).json(game);
});

const getGameById = asyncHandler(async (req, res) => {
  let game = await searchGameById(req.params.id);
  if (!game) {
    res.status(404);
    throw new Error("Game does not exist");
  }

  game = await formatPlayerData(game);

  res.status(201).json(game); 
});

const removeGame = asyncHandler(async (req, res) => {
  const gameId = req.params.id;
  const entityId = await getGameEntityId(gameId);

  await gameRepository.remove(entityId);

  res.status(201).json({ gameId });
});

export { createGame, updateGameState, getGameById, removeGame };
