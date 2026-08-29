import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { User, UserSchema } from './schemas/user.schema';
import { IdentityService } from './identity.service';
import { AdminController } from './admin.controller';
import { OptionalUserGuard, RolesGuard, UserJwtAuthGuard } from './auth.guards';

const jwtSecret = (): string => {
  const s = process.env.PORTAL_JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PORTAL_JWT_SECRET is required in production');
  }
  return 'dev-portal-jwt-secret-change-with-PORTAL_JWT_SECRET';
};

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: process.env.PORTAL_JWT_EXPIRES_IN ?? '8h' },
    }),
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [IdentityService, UserJwtAuthGuard, OptionalUserGuard, RolesGuard],
  exports: [IdentityService, UserJwtAuthGuard, OptionalUserGuard, RolesGuard, JwtModule, MongooseModule],
})
export class IdentityModule {}
