import { Controller, Get, HttpCode, HttpStatus, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { CurrentUser, UserJwtAuthGuard } from '../identity/auth.guards';
import { RequestUser } from '../identity/jwt-payload';

class LoginUserDto {
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ enum: ['admin', 'provider', 'viewer'] }) role!: string;
  @ApiProperty({ nullable: true, type: Object }) organization!: { id: string; slug: string; name: string } | null;
}

class PortalLoginResponseDto {
  @ApiProperty() access_token!: string;
  @ApiProperty({ enum: ['Bearer'] }) token_type!: 'Bearer';
  @ApiProperty({ description: 'Token TTL in seconds' }) expires_in!: number;
  @ApiProperty({ description: 'Email, or the legacy connector username' }) username!: string;
  @ApiProperty({ type: LoginUserDto, nullable: true }) user!: LoginUserDto | null;
}

@ApiTags('Portal auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in with email + password',
    description:
      'Returns a JWT for the Authorization: Bearer header. The `username` field also accepts a legacy portal connector username while those accounts are being migrated.',
  })
  @ApiOkResponse({ type: PortalLoginResponseDto })
  login(@Body() body: PortalLoginDto) {
    return this.auth.login(body.username, body.password);
  }

  @Get('me')
  @UseGuards(UserJwtAuthGuard)
  @ApiBearerAuth('portal-jwt')
  @ApiOperation({ summary: 'Identity behind the current token' })
  me(@CurrentUser() user: RequestUser | null) {
    return user;
  }
}
