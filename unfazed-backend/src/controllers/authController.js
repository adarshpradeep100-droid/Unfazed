import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Therapist } from '../models/index.js';
const makeSlug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function register(req,res) {
  try {
    const {name,email,password} = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({message:'Name, email and password (8+ characters) are required'});
    if (await Therapist.findOne({email})) return res.status(409).json({message:'Email already registered'});
    const base = makeSlug(name) || 'therapist'; let slug = base; let n = 2;
    while (await Therapist.findOne({slug})) slug = `${base}-${n++}`;
    const therapist = await Therapist.create({name,email,passwordHash:await bcrypt.hash(password,12),slug});
    const token = jwt.sign({id:therapist.id},process.env.JWT_SECRET,{expiresIn:'7d'});
    res.status(201).json({token,therapist:{id:therapist.id,name,email,slug}});
  } catch(e) { res.status(500).json({message:'Registration failed',error:e.message}); }
}
export async function login(req,res) {
  const therapist = await Therapist.findOne({email:req.body.email});
  if (!therapist || !await bcrypt.compare(req.body.password || '',therapist.passwordHash)) return res.status(401).json({message:'Invalid email or password'});
  const token = jwt.sign({id:therapist.id},process.env.JWT_SECRET,{expiresIn:'7d'});
  res.json({token,therapist:{id:therapist.id,name:therapist.name,email:therapist.email,slug:therapist.slug}});
}
