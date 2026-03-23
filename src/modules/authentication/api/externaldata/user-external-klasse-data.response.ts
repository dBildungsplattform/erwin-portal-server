import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class UserExternalKlasseDataResponse {
    @ApiProperty()
    @IsString()
    public externalId?: string;

    @ApiProperty()
    @IsString()
    public name!: string;

    @ApiProperty()
    @IsUUID()
    public erwinId!: string;

    public constructor(klasseResponse: Partial<UserExternalKlasseDataResponse>) {
        this.externalId = klasseResponse.externalId;
        this.name = klasseResponse.name!;
        this.erwinId = klasseResponse.erwinId!;
    }
}
