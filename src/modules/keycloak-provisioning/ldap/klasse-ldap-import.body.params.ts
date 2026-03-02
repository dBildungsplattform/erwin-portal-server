import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KlasseLdapImportBodyParams {
    @ApiProperty()
    @IsString()
    public klasseName!: string;

    @ApiProperty()
    @IsString()
    public ldapDn!: string; // externalId in Organisation
}
