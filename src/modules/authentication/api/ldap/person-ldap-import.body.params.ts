import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString } from 'class-validator';

export class PersonLdapImportDataBody {
    @ApiProperty()
    @IsString()
    public keycloakUserId!: string;

    @ApiProperty()
    @IsString()
    public firstName!: string;

    @ApiProperty()
    @IsString()
    public lastName!: string;

    @ApiProperty()
    @IsString()
    public ldapDn!: string; //externalId in Person

    @ApiProperty()
    @IsString()
    public email!: string;

    @ApiProperty()
    @IsDate()
    public geburtstag!: Date;
}
