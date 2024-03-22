import { Schema, Repository } from "redis-om";
import client from "../config/connectDB.js";

const gameSchema = new Schema("game", {
  gameId: { type: "string" },
  players: { type: "string[]" }, // list of players
  lobby: { type: "string[]" }, // 'lobby' of waiting players for when game is active - add them on next game start
  host: { type: "string" }, // the host player who controls when the game starts and when to go to the next round
  questionMaster: { type: "string" },
  fakeArtist: { type: "string" },
  currentArtist: { type: "string" },
  canvasState: { type: "string" },
  gameState: { type: "string" },
  category: { type: "string" },
  title: { type: "string" },
  playerIdCounter: { type: "number" },
  availableColorCodes: { type: "number[]" },
  roundCount: { type: "number" },
  gameLength: { type: "number" },
  votes: { type: "number[]" },
  voterInfo: { type: "string[]" },
});

export const gameRepository = new Repository(gameSchema, client);

await gameRepository.createIndex();
