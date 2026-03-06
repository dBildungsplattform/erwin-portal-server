import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { KlasseLdapImportBodyParams } from './klasse-ldap-import.body.params.js';
import { SchuleLdapImportBodyParams } from './schule-ldap-import.body.params.js';
import { PersonLdapImportDataBody } from './person-ldap-import.body.params.js';
import { Type } from 'class-transformer';
import { ErwinLdapMappedRollenArt } from '../../rollenmapping/domain/lms-rollenarten.enums.js';

export class LdapUserDataBodyParams {
    @ApiProperty({ type: () => KlasseLdapImportBodyParams })
    @ValidateNested()
    @Type(() => KlasseLdapImportBodyParams)
    public klasse!: KlasseLdapImportBodyParams;

    @ApiProperty({ type: () => SchuleLdapImportBodyParams })
    @ValidateNested()
    @Type(() => SchuleLdapImportBodyParams)
    public schule!: SchuleLdapImportBodyParams;

    @ApiProperty({ type: () => PersonLdapImportDataBody })
    @ValidateNested()
    @Type(() => PersonLdapImportDataBody)
    public person!: PersonLdapImportDataBody;

    @ApiProperty()
    @IsString()
    public role!: ErwinLdapMappedRollenArt;

    public constructor(params: Readonly<LdapUserDataBodyParams>) {
        Object.assign(this, params);
    }
}
