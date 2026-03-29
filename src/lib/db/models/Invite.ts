import mongoose, { Schema, Model } from 'mongoose';
import type { Role } from '@/lib/db/models/User';

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface IInvite {
  email:        string;
  token:        string;    // SHA-256 hash of plaintext token stored; plaintext sent in email
  status:       InviteStatus;
  expiresAt:    Date;
  createdBy:    string;    // User._id as string
  role:         Role;
  collectionIds?: string[];  // Optional: collection-scoped access; empty/absent = all-org
  createdAt?: Date;
  updatedAt?: Date;
}

type InviteDoc = Omit<IInvite, '_id'>;

const inviteSchema = new Schema<InviteDoc>(
  {
    email:     { type: String, required: true, lowercase: true, trim: true },
    token:     { type: String, required: true, unique: true },
    status:    { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    createdBy: { type: String, required: true },
    role:         { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
    collectionIds: { type: [String], required: false, default: undefined },
  },
  { timestamps: true }
);

inviteSchema.index({ email: 1 });
// Note: Do NOT add a TTL index on expiresAt — documents are kept with status='accepted' for audit trail

// Guard against Next.js hot-reload model re-registration
const Invite: Model<InviteDoc> =
  (mongoose.models.Invite as Model<InviteDoc>) ||
  mongoose.model<InviteDoc>('Invite', inviteSchema);

export default Invite;
