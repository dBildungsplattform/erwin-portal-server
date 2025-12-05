import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LdapUserDataBodyParams {
    @ApiProperty()
    @IsString()
    public keycloakUserId!: string;

    @ApiProperty()
    @IsString()
    public userName!: string;

    @ApiProperty()
    @IsString()
    @IsEmail()
    public email!: string;

    @ApiProperty()
    @IsString()
    public firstName!: string;

    @ApiProperty()
    @IsString()
    public lastName!: string;

    @ApiProperty()
    @IsString()
    public ldapDn!: string;

    @ApiProperty()
    @IsString()
    public ldapId!: string;

    public constructor(params: Readonly<LdapUserDataBodyParams>) {
        Object.assign(this, params);
    }
}
