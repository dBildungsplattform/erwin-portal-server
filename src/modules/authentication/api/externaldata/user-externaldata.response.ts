import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { UserExternalPersonDataResponse } from './user-external-person-data.response.js';
import { UserExternalKlasseDataResponse } from './user-external-klasse-data.response.js';
import { UserExternalSchuleDataResponse } from './user-external-schule-data.response.js';

export class UserExternalDataResponse {
    @ApiProperty()
    @IsString()
    public sub!: string;

    @ApiProperty({ type: UserExternalPersonDataResponse })
    public personData!: UserExternalPersonDataResponse;

    @ApiProperty({ type: UserExternalSchuleDataResponse })
    public schuleData!: UserExternalSchuleDataResponse;

    @ApiProperty({ type: [UserExternalKlasseDataResponse] })
    @IsArray()
    public klasseData?: UserExternalKlasseDataResponse[];

    private constructor(
        sub: string,
        personData: UserExternalPersonDataResponse,
        schuleData: UserExternalSchuleDataResponse,
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
