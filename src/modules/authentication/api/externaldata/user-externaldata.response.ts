import { ApiProperty } from '@nestjs/swagger';
import { UserExternalPersonDataResponse } from './user-external-person-data.response.js';
import { UserExternalKlasseDataResponse } from './user-external-klasse-data.response.js';
import { UserExternalSchuleDataResponse } from './user-external-schule-data.response.js';

export class UserExternalDataResponse {
    @ApiProperty()
    public keycloakUserId!: string;

    @ApiProperty({ type: UserExternalPersonDataResponse })
    public personData!: UserExternalPersonDataResponse;

    @ApiProperty({ type: UserExternalSchuleDataResponse, required: true })
    public schuleData!: UserExternalSchuleDataResponse;

    @ApiProperty({ type: [UserExternalKlasseDataResponse] })
    public klasseData?: UserExternalKlasseDataResponse[];

    public constructor(
        sub: string,
        personData: UserExternalPersonDataResponse,
        schuleData: UserExternalSchuleDataResponse,
        klasseData: UserExternalKlasseDataResponse[],
    ) {
        this.keycloakUserId = sub;
        this.personData = personData;
        this.schuleData = schuleData;
        this.klasseData = klasseData;
    }
}
