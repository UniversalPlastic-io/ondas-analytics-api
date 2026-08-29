import { ApiProperty } from '@nestjs/swagger';

export class PortalLoginDto {
  @ApiProperty({
    example: 'impact@universalplastic.io',
    description: 'Email of the user. Legacy portal connector usernames are still accepted.',
  })
  username!: string;

  @ApiProperty()
  password!: string;
}
