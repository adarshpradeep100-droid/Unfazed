import { Client, SubscriptionTierConfig } from '../models/index.js';
// Centralized feature gate: routes should call this rather than checking tier strings.
export async function canAccess(therapistId, featureKey) {
  const therapist = await (await import('../models/index.js')).Therapist.findById(therapistId).lean();
  if (!therapist) return false;
  const config = await SubscriptionTierConfig.findOne({name:therapist.tier}).lean();
  if (!config) {
  if (featureKey === 'activeClient') return true;
  return featureKey === 'basic';
}
  if (featureKey === 'analytics') return Boolean(config.features?.analytics);
  if (featureKey === 'templates') return Boolean(config.features?.templates);
  if (featureKey === 'activeClient') {
    const count = await Client.countDocuments({therapistId, status:'active'});
    return count < (config.caps?.activeClients ?? 5);
  }
  return featureKey === 'basic';
}
