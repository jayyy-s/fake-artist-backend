import { Router } from "express";
import { createGame, updateGameState, getGameById } from "../controllers/gameController.js";

const router = Router();

router.post("/", createGame);
router.put("/:id", updateGameState);
router.get("/:id", getGameById);


export default router;
