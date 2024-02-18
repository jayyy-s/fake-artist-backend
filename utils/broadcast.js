import connections from "../connections.js";

const broadcast = (gameId, data, sender) => {
  Object.keys(connections).forEach((uuid) => {
    if (uuid === sender) return;
    if (gameId !== connections[uuid].gameId) return; // only send to connections in the same game
    const conn = connections[uuid];
    conn.send(JSON.stringify(data));
  });
};

export default broadcast;