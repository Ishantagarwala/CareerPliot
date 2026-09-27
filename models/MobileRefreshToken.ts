import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

/**
 * One issued mobile refresh token.
 *
 * A collection rather than a field on User, because rotation needs a set of
 * live tokens per user (one per device) and revocation needs to address a
 * single one. An array on the user document would make both awkward and grow
 * unbounded.
 *
 * Only the HASH of the token is stored. A database dump therefore does not
 * yield usable refresh tokens, the same reasoning that applies to passwords.
 */
export interface IMobileRefreshToken extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  /** sha256 of the refresh JWT — never the token itself */
  tokenHash: string;
  /** matches the `jti` claim, so a token can be traced to its row */
  tokenId: string;
  /** best-effort, for a future "signed in on these devices" screen */
  deviceLabel?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  /**
   * Set when this token is rotated. Kept briefly rather than deleted so a
   * replayed token can be distinguished from an unknown one — that difference
   * is what makes reuse detection possible.
   */
  rotatedAt?: Date;
  /** set on rotation; the token that replaced this one */
  replacedBy?: string;
}

const MobileRefreshTokenSchema = new Schema<IMobileRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  tokenId: { type: String, required: true, index: true },
  deviceLabel: { type: String },
  lastUsedAt: { type: Date },
  rotatedAt: { type: Date },
  replacedBy: { type: String },
}, { timestamps: true });

/**
 * Mongo drops documents once `expires` passes, so expired rows do not
 * accumulate. The TTL is deliberately longer than the token lifetime so a
 * rotated token's row survives long enough to detect reuse.
 */
MobileRefreshTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.models.MobileRefreshToken ||
  mongoose.model<IMobileRefreshToken>('MobileRefreshToken', MobileRefreshTokenSchema);
