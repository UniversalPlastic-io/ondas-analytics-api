import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const USER_ROLES = ['admin', 'provider', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  /** bcrypt hash. Never selected by default. */
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: String, required: true, enum: USER_ROLES, default: 'viewer' })
  role!: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'Organization', default: null })
  organizationId!: Types.ObjectId | null;

  /** Legacy portal connector username, kept so old logins keep resolving. */
  @Prop({ type: String, default: null })
  legacyUsername!: string | null;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ organizationId: 1 });
UserSchema.index({ legacyUsername: 1 });
