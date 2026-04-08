import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class PersonLdapImportDataBody {
    @ApiProperty()
    @IsString()
    public keycloakUserId!: string;

    @ApiProperty()
    @IsString()
    public vorname!: string;

    @ApiProperty()
    @IsString()
    public nachname!: string;

    @ApiProperty()
    @IsString()
    public externalId!: string; //ldapDn

    @ApiProperty()
    @IsString()
    @IsOptional()
    public email?: string;

    @ApiProperty()
    @IsDate()
    @IsOptional()
    public geburtstag?: Date;
}
