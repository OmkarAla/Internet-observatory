import { Server } from 'socket.io';

let io = null;

export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('subscribe', ({ id, type }) => {
      const room = `${type}:${id}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('unsubscribe', ({ id, type }) => {
      const room = `${type}:${id}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const broadcastCheckResult = (id, type, result) => {
  const room = `${type}:${id}`;
  io.to(room).emit('check:result', { id, type, result });
};

export const broadcastCircuitChange = (id, state) => {
  io.emit('circuit:change', { id, state });
};
