import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString } from 'class-validator';

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
    public email!: string;

    @ApiProperty()
    @IsDate()
    public geburtstag!: Date;
}
