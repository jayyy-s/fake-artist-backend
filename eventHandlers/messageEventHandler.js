import {
  broadcast,
  emit,
  broadcastCurrentArtist,
  SEND_TO_SENDER,
} from "../utils/messageSendUtils.js";
import connections from "../connections.js";
import {
  searchGameById,
  getGameEntityId,
  removePlayerFromGame,
  getPlayers,
  cycleArtist,
  getPlayerByConnId,
  updatePlayer,
  hasAllVoted,
  sortedVotes,
  getPlayerByPlayerId,
} from "../utils/gameUtils.js";
import { randomColorCombo, COLOR_COMBOS } from "../utils/miscUtils.js";
import asyncHandler from "express-async-handler";
import { gameRepository } from "../models/gameModel.js";

const handleMessage = asyncHandler(async (bytes, connId) => {
  const message = JSON.parse(bytes.toString());
  const { gameId } = message.data;
  const game = await searchGameById(gameId);

  const sendingPlayer = game.players.find((p) => p.includes(connId));

  switch (message.type) {
    case "clientReady":
      const { username } = message.data;
      connections[connId].gameId = gameId;
      if (!game) return; // return on null games (can happen if navigated to invalid id)
      const playerColorCombo = randomColorCombo(game.availableColorCodes);
      const playerId = game.playerIdCounter;
      // add player if not already included
      if (!sendingPlayer) {
        // remove new color from available colors
        game.availableColorCodes.splice(
          game.availableColorCodes.indexOf(
            COLOR_COMBOS.indexOf(playerColorCombo)
          ),
          1
        );

        game.playerIdCounter = game.playerIdCounter + 1; // Increment id counter to give next player id unique to game
        const playerToAdd = {
          connId, // Used only by server/DB to broadcast/track player states
          playerId, // Used to send information about other clients to client
          username,
          colorCombo: playerColorCombo,
          hasVoted: false,
        };

        game.players.push(JSON.stringify(playerToAdd));
        if (game.players.length === 1) {
          // make the first player the host
          game.host = connId;
          emit(connId, { type: "setHostClient" });
        }
      }

      // Inform the other clients of new player
      broadcast(
        gameId,
        { type: "updatePlayers", data: { players: getPlayers(game) } },
        connId,
        SEND_TO_SENDER
      );
      // Tell player their own color code
      emit(connId, {
        type: "serverConnected",
        data: { colorCombo: playerColorCombo, playerId },
      });
      await gameRepository.save(game);
      break;
    case "drawLine":
      if (game.gameState === "active") {
        await cycleArtist(game, connId);
        const { canvasState } = game;
        broadcast(
          gameId,
          { type: "drawCurrentCanvasState", data: { canvasState } },
          connId
        );
      }
      break;
    case "hostStartGame":
      if (game.players.length < 4) {
        // Don't allow games to start with less than 4 players
        emit(connId, { type: "notEnoughPlayers" });
        break;
      }

      const questionMasterIndex = Math.floor(
        Math.random() * game.players.length
      );
      let fakeArtistIndex = Math.floor(Math.random() * game.players.length);

      while (fakeArtistIndex === questionMasterIndex) {
        // regenerate if both indicies are equal
        // could technically be optimized to not generate the same number more than once
        fakeArtistIndex = Math.floor(Math.random() * game.players.length);
      }

      // set question master
      const questionMasterJson = JSON.parse(game.players[questionMasterIndex]);
      const questionMaster = questionMasterJson.connId;
      game.questionMaster = questionMaster;

      // set fake artist
      const fakeArtistJson = JSON.parse(game.players[fakeArtistIndex]);
      const fakeArtist = fakeArtistJson.connId;
      game.fakeArtist = fakeArtist;
      game.gameState = "active";

      await gameRepository.save(game);
      broadcast(
        gameId,
        {
          type: "serverStartGame",
          data: {
            questionMaster: {
              username: questionMasterJson.username,
              id: questionMasterJson.playerId,
            },
          },
        },
        connId,
        SEND_TO_SENDER
      );
      emit(questionMaster, { type: "promptQuestionMaster" });
      break;
    case "setPrompt":
      let randomPlayerIndex = Math.floor(Math.random() * game.players.length);
      let firstArtistJson = JSON.parse(game.players[randomPlayerIndex]);

      while (firstArtistJson.connId === game.questionMaster) {
        randomPlayerIndex = Math.floor(Math.random() * game.players.length);
        firstArtistJson = JSON.parse(game.players[randomPlayerIndex]);
      }

      const firstArtist = firstArtistJson.connId;
      game.currentArtist = firstArtist;
      game.firstArtist = firstArtist;
      const { category, title } = game;

      await gameRepository.save(game);
      // SMELL: Two broadcasts seems odd?...maybe change to single message w/ cat, title, first artist
      // Inform all players except fake artist of category + title
      broadcast(
        gameId,
        {
          type: "setPrompt",
          data: { category, title },
        },
        game.fakeArtist
      );
      emit(game.fakeArtist, {
        type: "setPrompt",
        data: { category, title: "???" },
      });
      // Inform all players of current artist
      broadcastCurrentArtist(gameId, connId, {
        username: firstArtistJson.username,
        id: firstArtistJson.playerId,
      });
      emit(firstArtist, { type: "drawingTurn" });
      break;
    case "castVote":
      // TODO: Handle player disconnects during voting
      const { id } = message.data;
      game.votes.push(id);
      const player = await getPlayerByConnId(connId, gameId);
      player.hasVoted = true;

      const playerVoterInfo = {
        voterId: player.playerId,
        votedPlayerId: id,
      };

      game.voterInfo.push(JSON.stringify(playerVoterInfo));

      await gameRepository.save(await updatePlayer(game, player));

      // voting is over when there are votes from everyone
      if (hasAllVoted(game)) {
        // check most voted
        const sortedVoteCounts = sortedVotes(game);
        const mostVotedId =
          sortedVoteCounts[1] &&
          sortedVoteCounts[0].voteCount === sortedVoteCounts[1].voteCount
            ? "-1" // Tie for most voted
            : sortedVoteCounts[0].playerId;
        const mostVotedPlayer = getPlayerByPlayerId(
          game,
          parseInt(mostVotedId)
        );

        const voterData = game.voterInfo.map((voterInfo) =>
          JSON.parse(voterInfo)
        );
        const sortedVoterDataMap = voterData.reduce(
          (sortedVotes, voterInfo) => {
            const { votedPlayerId, voterId } = voterInfo;
            let votesSortedSoFar = sortedVotes.get(votedPlayerId) || [];
            votesSortedSoFar.push(voterId);
            sortedVotes.set(votedPlayerId, votesSortedSoFar);
            return sortedVotes;
          },
          new Map()
        );
        const sortedVoterDataJson = Array.from(
          sortedVoterDataMap,
          ([votedPlayerId, voterIds]) => ({ votedPlayerId, voterIds })
        );

        broadcast(
          gameId,
          { type: "voterData", data: { voterData: sortedVoterDataJson } },
          connId,
          SEND_TO_SENDER
        );

        // if EXCLUSIVELY fake artist, prompt fake artist to guess
        if (mostVotedPlayer && mostVotedPlayer.connId === game.fakeArtist) {
          //   fake artist sends guess
          //   question master prompted to evaluate
          //   question master determines if it was close enough
          emit(game.fakeArtist, { type: "promptFakeArtistGuess" });
          broadcast(gameId, { type: "fakeArtistFound" }, game.fakeArtist);
        } else {
          // fake artist wins
          broadcast(gameId, { type: "fakeArtistWin" }, connId, SEND_TO_SENDER);
        }
      }
      break;
    case "fakeArtistTitleGuess":
      emit(game.questionMaster, {
        type: "promptQuestionMasterTitleCheck",
        data: { fakeArtistGuess: message.data.fakeArtistGuess },
      });
      break;
    case "questionMasterDecision":
      let { decision } = message.data;
      if (decision === "correct") {
        broadcast(gameId, { type: "fakeArtistWin" }, connId, SEND_TO_SENDER);
      } else {
        broadcast(gameId, { type: "realArtistsWin" }, connId, SEND_TO_SENDER);
      }
      break;
  }
});

const handleClose = asyncHandler(async (connId) => {
  const { gameId } = connections[connId];
  const game = await removePlayerFromGame(gameId, connId);
  delete connections[connId];

  // lil null checky
  if (!game) return;

  // delete games with no players
  if (game.players.length === 0 || connId === game.host) {
    const entityId = await getGameEntityId(gameId);
    await gameRepository.remove(entityId);
  } else {
    // if the game still exists, send message to other clients to remove
    broadcast(
      gameId,
      { type: "updatePlayers", data: { players: getPlayers(game) } }, // Remove players
      connId
    );
  }
});

export { handleMessage, handleClose };
