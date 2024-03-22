import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";
import { v4 as uuidv4 } from "uuid";
import {
  searchGameById,
  getGameEntityId,
  getPlayerByConnId,
  getPlayers,
} from "../utils/gameUtils.js";
import { COLOR_COMBOS } from "../utils/miscUtils.js";

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
    lobby: [],
    host: "",
    questionMaster: "",
    fakeArtist: "",
    currentArtist: "",
    firstArtist: "",
    canvasState: "",
    gameState: "inactive",
    category: "",
    title: "",
    playerIdCounter: 0,
    availableColorCodes: Array.from(Array(COLOR_COMBOS.length).keys()),
    roundCount: 0,
    gameLength: 2,
    votes: [],
    voterInfo: [],
  };

  await gameRepository.save(newGame);

  res.status(201).json(newGame);
});

const updateGameState = asyncHandler(async (req, res) => {
  let game = await searchGameById(req.params.id);

  if (req.body.canvasState) {
    game.canvasState = req.body.canvasState;
  }

  if (req.body.prompt) {
    const { prompt } = req.body;
    game.category = prompt.category;
    game.title = prompt.title;
  }

  // save game to DB
  await gameRepository.save(game);

  // format players before sending to client
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
