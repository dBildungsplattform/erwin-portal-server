import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import { UserExternalPersonDataResponse } from './user-external-person-data.response.js';
import { UserExternalKlasseDataResponse } from './user-external-klasse-data.response.js';
import { UserExternalSchuleDataResponse } from './user-external-schule-data.response.js';

export class UserExternalDataResponse {
    @ApiProperty()
    @IsUUID()
    public sub!: string;

    @ApiProperty({ type: UserExternalPersonDataResponse })
    public personData!: UserExternalPersonDataResponse;

    @ApiProperty({ type: UserExternalSchuleDataResponse, required: false })
    public schuleData?: UserExternalSchuleDataResponse; //not nullable

    @ApiProperty({ type: [UserExternalKlasseDataResponse] })
    @IsArray()
    public klasseData?: UserExternalKlasseDataResponse[];

    public constructor(
        sub: string,
        personData: UserExternalPersonDataResponse,
        schuleData: UserExternalSchuleDataResponse | undefined,
        klasseData: UserExternalKlasseDataResponse[],
    ) {
        this.sub = sub;
        this.personData = personData;
        this.schuleData = schuleData;
        this.klasseData = klasseData;
    }

    // public static createNew(
    //     sub: string,
    //     personData: UserExternalPersonDataResponse,
    //     schuleData: UserExternalSchuleDataResponse,
    //     klasseData: UserExternalKlasseDataResponse[],
    // ): UserExternalDataResponse {
    //     const response: UserExternalDataResponse = new UserExternalDataResponse(
    //         sub,
    //         personData,
    //         schuleData,
    //         klasseData,
    //     );
    //     return response;
    // }
}
