import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ROLES, UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @ApiProperty({ example: 'impact@innoceana.org' })
  email!: string;

  @ApiProperty({ minLength: 10, description: 'At least 10 characters' })
  password!: string;

  @ApiProperty({ example: 'Innoceana Impact Team' })
  name!: string;

  @ApiProperty({ enum: USER_ROLES, example: 'provider' })
  role!: UserRole;

  @ApiPropertyOptional({ example: 'innoceana', description: 'Required for role "provider"' })
  organizationSlug?: string;

  @ApiPropertyOptional({ example: 'user_innoceana', description: 'Legacy portal connector username' })
  legacyUsername?: string;
}

export class SetPasswordDto {
  @ApiProperty({ example: 'impact@innoceana.org' })
  email!: string;

  @ApiProperty({ minLength: 10 })
  password!: string;
}
