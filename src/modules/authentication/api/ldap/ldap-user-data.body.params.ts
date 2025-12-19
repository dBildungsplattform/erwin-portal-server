import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

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
    @IsOptional()
    public email?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    public firstName?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    public lastName?: string;

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
