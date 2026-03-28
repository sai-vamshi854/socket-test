const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room: ${room}`);
    socket.to(room).emit("user-joined", { id: socket.id });
  });

  socket.on("approve", (data) => {
    console.log("approve received:", data);
    // broadcast to everyone else in the room
    socket.to(data.room).emit("approved", {
      from: socket.id,
      message: data.message || "Approved!",
      timestamp: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
