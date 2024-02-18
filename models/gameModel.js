import { Schema, Repository } from "redis-om";
import client from "../config/connectDB.js";


// const playerRole = {
//   QUESTION_MASTER: "QM",
//   FAKE_ARTIST: "FA",
//   REAL_ARTIST: "RA",
// };

/*
type Player = {
  connId: String,
  name: String,
  score: Number,
  status: String,
};
*/

/*

POTENTIAL SCHEMA:

game: {
  gameId: { type: "string" },
  canvasState: { type: "string" },
  questionMaster: { type: "string" },
  fakeArtist: { type: "string" },
  currentArtist: { type: "string" }
}

*/

const gameSchema = new Schema("game", {
  gameId: { type: "string" },
  // players: { type: "string" }, // stringify'd JSON of players
  canvasState: { type: "string" },
});

export const gameRepository = new Repository(gameSchema, client);

await gameRepository.createIndex();
