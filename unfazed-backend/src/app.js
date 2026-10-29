import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
const app=express();
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'}));
app.use(express.json({limit:'1mb'}));
app.use('/api',routes);
app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({message:'Unexpected server error'}); });
export default app;
