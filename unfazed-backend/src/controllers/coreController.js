import { Therapist, Client, Availability, SessionNote, Payment, SubscriptionTierConfig } from '../models/index.js';
import { canAccess } from '../services/entitlementService.js';
export async function publicProfile(req,res) { const t=await Therapist.findOne({slug:req.params.slug}).select('name bio specializations languages slug'); if(!t) return res.status(404).json({message:'Profile not found'}); res.json(t); }
export async function updateProfile(req,res) { const fields={}; for(const k of ['name','bio','specializations','languages']) if(req.body[k]!==undefined) fields[k]=req.body[k]; const t=await Therapist.findByIdAndUpdate(req.user.id,fields,{new:true}).select('-passwordHash'); res.json(t); }
export async function listClients(req,res) { res.json(await Client.find({therapistId:req.user.id}).sort({createdAt:-1})); }
export async function createClient(req,res) { if(!await canAccess(req.user.id,'activeClient')) return res.status(403).json({message:'Active-client limit reached. Upgrade your plan.'}); const c=await Client.create({...req.body,therapistId:req.user.id}); res.status(201).json(c); }
export async function createAvailability(req,res) { const {startAt,endAt}=req.body; if(!startAt||!endAt||new Date(endAt)<=new Date(startAt)) return res.status(400).json({message:'Valid startAt and endAt are required'}); res.status(201).json(await Availability.create({therapistId:req.user.id,startAt,endAt})); }
export async function listAvailability(req,res) { res.json(await Availability.find({therapistId:req.user.id,booked:false,startAt:{$gte:new Date()}}).sort({startAt:1})); }
export async function bookSlot(req,res) { const slot=await Availability.findOneAndUpdate({_id:req.params.id,booked:false,startAt:{$gt:new Date()}},{$set:{booked:true,clientId:req.body.clientId}},{new:true}); if(!slot) return res.status(409).json({message:'Slot unavailable'}); res.json(slot); }
export async function createNote(req,res) { const client=await Client.findOne({_id:req.body.clientId,therapistId:req.user.id}); if(!client) return res.status(404).json({message:'Client not found'}); res.status(201).json(await SessionNote.create({therapistId:req.user.id,clientId:client.id,type:req.body.type==='shared'?'shared':'private',content:req.body.content,sessionAt:req.body.sessionAt})); }
export async function listNotes(req,res) { const filter={therapistId:req.user.id}; if(req.query.clientId) filter.clientId=req.query.clientId; res.json(await SessionNote.find(filter).sort({createdAt:-1})); }
export async function sharedNotes(req,res) { res.json(await SessionNote.find({clientId:req.params.clientId,type:'shared'}).select('content sessionAt createdAt')); }
export async function createOrder(req,res) { try { const amount=Number(req.body.amount); if(!Number.isFinite(amount)||amount<1) return res.status(400).json({message:'Amount must be positive (INR)'}); const razorpay=(await import('../config/razorpay.js')).getRazorpay(); const order=await razorpay.orders.create({amount:Math.round(amount*100),currency:'INR',receipt:`unfazed_${Date.now()}`}); const payment=await Payment.create({therapistId:req.user.id,orderId:order.id,amount,currency:'INR',status:'created'}); res.status(201).json({orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID,paymentRecordId:payment.id}); } catch(e) { res.status(500).json({message:'Could not create payment order. Check Razorpay test keys.',error:e.message}); } }
export async function confirmPayment(req,res) { const {orderId,paymentId}=req.body; if(!orderId||!paymentId) return res.status(400).json({message:'orderId and paymentId are required'}); // PAYMENT ID NOTE: if your assignment requires a manually entered Payment ID, put it in the frontend comment-marked field. In real checkout Razorpay generates this ID.
 const record=await Payment.findOneAndUpdate({orderId,therapistId:req.user.id},{$set:{gatewayTransactionId:paymentId,status:'submitted-for-verification'}},{new:true}); if(!record) return res.status(404).json({message:'Payment order not found'}); res.json({message:'Payment ID recorded. Verify signature/webhook before treating payment as successful.',payment:record}); }
export async function analytics(req,res) { if(!await canAccess(req.user.id,'analytics')) return res.status(403).json({message:'Analytics are not available on your current tier'}); const [clients,payments]=await Promise.all([Client.countDocuments({therapistId:req.user.id,status:'active'}),Payment.aggregate([{$match:{therapistId:(await Therapist.findById(req.user.id))._id,status:'paid'}},{$group:{_id:null,revenue:{$sum:'$amount'}}}])]); res.json({activeClients:clients,revenue:payments[0]?.revenue||0}); }

export async function tiers(req, res) {
  const defaults = [
    {
      name: 'free',
      caps: { activeClients: 5 },
      features: { analytics: false, templates: false }
    },
    {
      name: 'pro',
      caps: { activeClients: 50 },
      features: { analytics: true, templates: true }
    },
    {
      name: 'premium',
      caps: { activeClients: 200 },
      features: { analytics: true, templates: true }
    }
  ];

  for (const tier of defaults) {
    await SubscriptionTierConfig.updateOne(
      { name: tier.name },
      { $set: tier },
      { upsert: true }
    );
  }

  res.json(await SubscriptionTierConfig.find().select('-__v'));
}

export async function selectTier(req, res) {
  const tier = String(req.body.tier || '').toLowerCase();

  if (!['free', 'pro', 'premium'].includes(tier)) {
    return res.status(400).json({ message: 'Invalid subscription plan' });
  }

  const config = await SubscriptionTierConfig.findOne({ name: tier });

  if (!config) {
    return res.status(404).json({ message: 'Subscription plan not found' });
  }

  const therapist = await Therapist.findByIdAndUpdate(
    req.user.id,
    { tier },
    { new: true }
  ).select('-passwordHash');

  if (!therapist) {
    return res.status(404).json({ message: 'Therapist not found' });
  }

  res.json({
    message: `Demo plan changed to ${tier}. No payment was processed.`,
    therapist: {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      slug: therapist.slug,
      tier: therapist.tier
    }
  });
}


 