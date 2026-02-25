import mongoose, { Schema, Model } from 'mongoose';
import type { ITokenCollection } from '@/types/collection.types';

// Mongoose document type (ITokenCollection without _id string; mongoose adds its own)
type TokenCollectionDoc = Omit<ITokenCollection, '_id'>;

const sourceMetadataSchema = new Schema(
  {
    repo:   { type: String, default: null },
    branch: { type: String, default: null },
    path:   { type: String, default: null },
  },
  { _id: false }
);

const tokenCollectionSchema = new Schema<TokenCollectionDoc>(
  {
    name:           { type: String, required: true, trim: true },
    tokens:         { type: Schema.Types.Mixed, required: true },
    sourceMetadata: { type: sourceMetadataSchema, default: null },
    userId:         { type: String, default: null, index: true },
  },
  {
    timestamps: true,  // auto createdAt / updatedAt
  }
);

// Index for fast listing by name
tokenCollectionSchema.index({ name: 1 });

// Guard against Next.js hot-reload model re-registration
const TokenCollection: Model<TokenCollectionDoc> =
  (mongoose.models.TokenCollection as Model<TokenCollectionDoc>) ||
  mongoose.model<TokenCollectionDoc>('TokenCollection', tokenCollectionSchema);

export default TokenCollection;
