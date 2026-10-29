import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { attachChatSocket } from './src/sockets/chatSocket.js';

const server = http.createServer(app);
attachChatSocket(server);
const port = process.env.PORT || 5000;
connectDB().then(() => server.listen(port, () => console.log(`Unfazed API running on http://localhost:${port}`)));
