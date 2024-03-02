import connections from "../connections.js";

const SEND_TO_SENDER = true;

const emit = (connId, data) => {
  const conn = connections[connId];
  conn.send(JSON.stringify(data));
};

const broadcast = (gameId, data, sender, isSendBackToSender) => {
  Object.keys(connections).forEach((connId) => {
    if (!isSendBackToSender && connId === sender) return;
    if (gameId !== connections[connId].gameId) return; // only send to connections in the same game
    emit(connId, data);
  });
};

const broadcastCurrentArtist = (gameId, connId, currentArtist) => {
  broadcast(
    gameId,
    {
      type: "setCurrentArtist",
      data: { currentArtist },
    },
    connId,
    SEND_TO_SENDER
  );
};

export { broadcast, emit, broadcastCurrentArtist, SEND_TO_SENDER };
