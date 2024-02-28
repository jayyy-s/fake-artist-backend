import connections from "../connections.js";

const emit = (playerId, data) => {
  console.log(playerId);
  const conn = connections[playerId];
  conn.send(JSON.stringify(data));
};

const broadcast = (gameId, data, sender, isSendBackToSender) => {
  Object.keys(connections).forEach((playerId) => {
    if (!isSendBackToSender && playerId === sender) return;
    if (gameId !== connections[playerId].gameId) return; // only send to connections in the same game
    emit(playerId, data);
  });
};

export { broadcast, emit };
