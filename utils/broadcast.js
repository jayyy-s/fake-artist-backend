import connections from "../connections.js";

const broadcast = (gameId, data, sender) => {
  Object.keys(connections).forEach((playerId) => {
    if (playerId === sender) return;
    if (gameId !== connections[playerId].gameId) return; // only send to connections in the same game
    const conn = connections[playerId];
    conn.send(JSON.stringify(data));
  });
};

export default broadcast;