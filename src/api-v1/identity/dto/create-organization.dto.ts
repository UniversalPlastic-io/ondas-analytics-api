import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationS3Dto {
  @ApiPropertyOptional({ example: 'universalplastic-sedia' })
  bucket?: string;

  @ApiPropertyOptional({
    example: 'public/mediterraneo/universal_plastic/',
    description: "This participant's space in the data space bucket",
  })
  prefix?: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'innoceana', description: 'Stable slug, lowercase, no spaces' })
  slug!: string;

  @ApiProperty({ example: 'Innoceana' })
  name!: string;

  @ApiPropertyOptional({ example: 'NGO', enum: ['Company', 'NGO', 'Institution', 'Campaign'] })
  type?: string;

  @ApiPropertyOptional({ example: 'Costa Brava, Catalunya, Spain' })
  territory?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'innoceana.org' })
  website?: string;

  @ApiPropertyOptional({ example: 'impact@innoceana.org' })
  contact?: string;

  @ApiPropertyOptional({ default: true })
  publicProfile?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['innoceana'],
    description: 'Every spelling of this org dataProviderId found in its files',
  })
  dataProviderIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['innoceana'],
    description: 'S3 provider folders owned by this org (public/{ocean}/{folder}/)',
  })
  providerFolders?: string[];

  @ApiPropertyOptional({ type: OrganizationS3Dto })
  s3?: OrganizationS3Dto;
}
