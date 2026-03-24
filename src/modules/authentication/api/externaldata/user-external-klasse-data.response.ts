import { ApiProperty } from '@nestjs/swagger';

export class UserExternalKlasseDataResponse {
    @ApiProperty()
    public externalId?: string;

    @ApiProperty()
    public name!: string;

    @ApiProperty()
    public erwinId!: string;

    public constructor(klasseResponse: Partial<UserExternalKlasseDataResponse>) {
        this.externalId = klasseResponse.externalId;
        this.name = klasseResponse.name!;
        this.erwinId = klasseResponse.erwinId!;
    }
}
