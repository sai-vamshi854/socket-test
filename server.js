const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 60000
});

app.use(express.static(path.join(__dirname, "public")));

const socketRooms = {};      // socketId -> room
const roomLastEvent = {};    // room -> last approve event (persists while server runs)

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // browser & mobile both join with a session/room id
  socket.on("join-room", (room) => {
    const prev = socketRooms[socket.id];
    if (prev) socket.leave(prev);

    socket.join(room);
    socketRooms[socket.id] = room;
    console.log(`joined room: "${room}" | sockets: ${io.sockets.adapter.rooms.get(room)?.size}`);

    socket.emit("room-joined", { room });

    // KEY: if mobile already approved while browser was away — replay it immediately
    if (roomLastEvent[room]) {
      console.log(`replaying missed approve to ${socket.id}`);
      socket.emit("approved", {
        ...roomLastEvent[room],
        replayed: true
      });
    }
  });

  // mobile clicks approve
  socket.on("approve", (data) => {
    const room = socketRooms[socket.id];
    if (!room) return;

    const event = {
      from: socket.id,
      user: data.user || "Mobile User",
      timestamp: new Date().toISOString()
    };

    // save it — so browser gets it even if it reconnects later
    roomLastEvent[room] = event;
    console.log(`approved in room "${room}" — saved for replay`);

    // send to everyone in room right now
    io.to(room).emit("approved", event);
  });

  socket.on("disconnect", () => {
    delete socketRooms[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
