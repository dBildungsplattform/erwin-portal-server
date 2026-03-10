import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { RollenArt } from '../../../rolle/domain/rolle.enums.js';

export interface UserExternalPersonData {
    externalId: string;
    firstName: string;
    lastName: string;
    role: RollenArt;
    email: string;
}

export class UserExternalPersonDataResponse {
    @ApiProperty()
    @IsString()
    public externalId!: string;

    @ApiProperty()
    @IsString()
    public firstName!: string;

    @ApiProperty()
    @IsString()
    public lastName!: string;

    @ApiProperty()
    @IsEnum(RollenArt)
    public role!: RollenArt;

    @ApiProperty()
    @IsString()
    public email!: string;

    public constructor(data: UserExternalPersonData) {
        this.externalId = data.externalId;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.role = data.role;
        this.email = data.email;
    }
}
