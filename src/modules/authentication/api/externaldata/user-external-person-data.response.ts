import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { RollenArt } from '../../../rolle/domain/rolle.enums.js';

export class UserExternalPersonDataResponse {
    @ApiProperty()
    @IsString()
    public externalId?: string;

    @ApiProperty()
    @IsString()
    public vorname!: string;

    @ApiProperty()
    @IsString()
    public familienname!: string;

    @ApiProperty()
    @IsEnum(RollenArt)
    public rolle!: RollenArt;

    @ApiProperty()
    @IsString()
    public email!: string;

    @ApiProperty()
    @IsUUID()
    public erwinId!: string;

    public constructor(personResponse: Partial<UserExternalPersonDataResponse>) {
        this.externalId = personResponse.externalId;
        this.vorname = personResponse.vorname!;
        this.familienname = personResponse.familienname!;
        this.rolle = personResponse.rolle!;
        this.email = personResponse.email!;
        this.erwinId = personResponse.erwinId!;
    }
}
