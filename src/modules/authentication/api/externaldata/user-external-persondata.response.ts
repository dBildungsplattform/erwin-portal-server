import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

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
    @IsString()
    public role!: string;

    @ApiProperty()
    @IsString()
    public email!: string;
}
