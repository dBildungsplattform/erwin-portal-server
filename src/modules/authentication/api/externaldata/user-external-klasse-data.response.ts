import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserExternalKlasseDataResponse {
    @ApiProperty()
    @IsString()
    public externalId!: string;

    @ApiProperty()
    @IsString()
    public name!: string;
}
