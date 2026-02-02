import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { KlasseLdapImportBodyParams } from './klasse-ldap-import.body.params.js';
import { SchuleLdapImportBodyParams } from './schule-ldap-import.body.params.js';
import { PersonLdapImportDataBody } from './person-ldap-import.body.params.js';
import { Type } from 'class-transformer';

export class LdapUserDataBodyParams {
    @ApiProperty({ type: () => KlasseLdapImportBodyParams })
    @ValidateNested()
    @Type(() => KlasseLdapImportBodyParams)
    public klasseParams!: KlasseLdapImportBodyParams;

    @ApiProperty({ type: () => SchuleLdapImportBodyParams })
    @ValidateNested()
    @Type(() => SchuleLdapImportBodyParams)
    public schuleParams!: SchuleLdapImportBodyParams;

    @ApiProperty({ type: () => PersonLdapImportDataBody })
    @ValidateNested()
    @Type(() => PersonLdapImportDataBody)
    public personParams!: PersonLdapImportDataBody;

    public constructor(params: Readonly<LdapUserDataBodyParams>) {
        Object.assign(this, params);
    }
}
