import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

let io = null;

export const initSocket = (httpServer) => {
  const clientUrl = process.env.CLIENT_URL || "*";

  io = new Server(httpServer, {
    cors: {
      origin: [clientUrl, "http://localhost:5173", "http://localhost:3000", "*"],
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ WebSocket client connected: ${socket.id}`);

    // Join show room for live seat updates
    socket.on("join:show", ({ showId }) => {
      if (showId) {
        socket.join(`show:${showId}`);
        console.log(`Socket ${socket.id} joined show room: show:${showId}`);
      }
    });

    // Leave show room
    socket.on("leave:show", ({ showId }) => {
      if (showId) {
        socket.leave(`show:${showId}`);
      }
    });

    // Real-time seat selection broadcast (User A selects seat -> User B sees yellow seat)
    socket.on("seat:selecting", ({ showId, seat, userId }) => {
      socket.to(`show:${showId}`).emit("seat:selecting", { seat, userId });
    });

    // Real-time seat release broadcast
    socket.on("seat:released", ({ showId, seat, userId }) => {
      socket.to(`show:${showId}`).emit("seat:released", { seat, userId });
    });

    socket.on("disconnect", () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
