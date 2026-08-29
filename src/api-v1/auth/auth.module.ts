import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityModule } from '../identity/identity.module';

@Module({
  // IdentityModule owns the JWT registration and the user/organization models.
  imports: [IdentityModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
