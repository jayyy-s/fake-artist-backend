import { Router } from "express";
import {
  createGame,
  updateGameState,
  getGameById,
  removeGame,
} from "../controllers/gameController.js";

const router = Router();

router.post("/", createGame);
router.put("/:id", updateGameState);
router.get("/:id", getGameById);
router.delete("/:id", removeGame);

export default router;
