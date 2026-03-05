import { ApiProperty } from '@nestjs/swagger';
import { UserExeternalDataResponseItslearning } from './user-externaldata-itslearning.response.js';
import { UserExeternalDataResponseOnlineDateiablage } from './user-externaldata-onlinedateiablage.response.js';
import { UserExeternalDataResponseOpsh } from './user-externaldata-opsh.response.js';
import { UserExeternalDataResponseOx } from './user-externaldata-ox.response.js';
import { UserExeternalDataResponseVidis } from './user-externaldata-vidis.response.js';
import { UserExeternalDataResponseOpshPk } from './user-externaldata-opsh-pk.response.js';
import { RequiredExternalPkData } from '../authentication.controller.js';
import { Person } from '../../../person/domain/person.js';
import { IsString } from 'class-validator';
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

    @ApiProperty({ type: UserExternalKlasseDataResponse })
    public klasseData!: UserExternalKlasseDataResponse;

    private constructor(
        personData: UserExternalPersonDataResponse,
        schuleData: UserExternalSchuleDataResponse,
        klasseData: UserExternalKlasseDataResponse,
    ) {
        this.personData = personData;
        this.schuleData = schuleData;
        this.klasseData = klasseData;
    }

    public static createNew(
        person: Person<true>,
        externalPkData: RequiredExternalPkData[],
        contextID: string,
    ): UserExternalDataResponse {
        const ox: UserExeternalDataResponseOx = new UserExeternalDataResponseOx(person.referrer!, contextID);
        const itslearning: UserExeternalDataResponseItslearning = new UserExeternalDataResponseItslearning(person.id);
        const vidis: UserExeternalDataResponseVidis = new UserExeternalDataResponseVidis(
            externalPkData.map((pk: RequiredExternalPkData) => pk.kennung),
        );
        const opsh: UserExeternalDataResponseOpsh = new UserExeternalDataResponseOpsh(
            person.vorname,
            person.familienname,
            externalPkData.map(
                (pk: RequiredExternalPkData) => new UserExeternalDataResponseOpshPk(pk.rollenart, pk.kennung),
            ),
            person.email,
        );
        const onlineDateiablage: UserExeternalDataResponseOnlineDateiablage =
            new UserExeternalDataResponseOnlineDateiablage(person.id);

        return new UserExternalDataResponse(ox, itslearning, vidis, opsh, onlineDateiablage);
    }
}
