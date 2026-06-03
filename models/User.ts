import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IUser extends MongooseDocument {
  name: string;
  email: string;
  password?: string;
  image?: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String }, // bcrypt hashed
  image: { type: String }, // OAuth profile image
  provider: { type: String, default: 'credentials' },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
