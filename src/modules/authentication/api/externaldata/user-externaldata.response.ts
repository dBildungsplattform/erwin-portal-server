import { ApiProperty } from '@nestjs/swagger';
import { RequiredExternalPkData } from '../authentication.controller.js';
import { Person } from '../../../person/domain/person.js';
import { IsArray, IsString } from 'class-validator';
import { UserExternalPersonDataResponse } from './user-external-persondata.response.js';
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
    public klasseData!: UserExternalKlasseDataResponse[];

    private constructor(
        personData: UserExternalPersonDataResponse,
        schuleData: UserExternalSchuleDataResponse,
        klasseData: UserExternalKlasseDataResponse[],
    ) {
        this.personData = personData;
        this.schuleData = schuleData;
        this.klasseData = klasseData;
    }

    public static createNew(sub: string): UserExternalDataResponse {
        return new UserExternalDataResponse(ox, itslearning, vidis, opsh, onlineDateiablage);
    }
}
