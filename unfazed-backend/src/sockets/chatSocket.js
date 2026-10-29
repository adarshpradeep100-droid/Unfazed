import { Server } from 'socket.io';
export function attachChatSocket(server) {
  const io=new Server(server,{cors:{origin:process.env.CLIENT_URL||'http://localhost:5173'}});
  io.on('connection',socket=>{
    socket.on('chat:join',room=>{ if(typeof room==='string'&&room.length<100) socket.join(room); });
    socket.on('chat:message',({room,message,sender}={})=>{ if(typeof room==='string'&&typeof message==='string'&&message.trim()) io.to(room).emit('chat:message',{message:message.trim().slice(0,2000),sender:String(sender||'User').slice(0,80),sentAt:new Date().toISOString()}); });
  });
  return io;
}
