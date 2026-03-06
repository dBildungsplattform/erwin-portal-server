import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KlasseLdapImportBodyParams {
    @ApiProperty()
    @IsString()
    public name!: string;

    @ApiProperty()
    @IsString()
    public externalId!: string; // ldapDn
}
