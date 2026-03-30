import { ApiProperty } from '@nestjs/swagger';
import { RollenArt } from '../../../rolle/domain/rolle.enums.js';

export class UserExternalPersonDataResponse {
    @ApiProperty()
    public externalId?: string;

    @ApiProperty()
    public vorname!: string;

    @ApiProperty()
    public familienname!: string;

    @ApiProperty()
    public rolle!: RollenArt;

    @ApiProperty()
    public email!: string;

    @ApiProperty()
    public geburtsdatum!: Date;

    @ApiProperty()
    public erwinId!: string;

    public constructor(personResponse: Partial<UserExternalPersonDataResponse>) {
        this.externalId = personResponse.externalId;
        this.vorname = personResponse.vorname!;
        this.familienname = personResponse.familienname!;
        this.rolle = personResponse.rolle!;
        this.email = personResponse.email!;
        this.geburtsdatum = personResponse.geburtsdatum!;
        this.erwinId = personResponse.erwinId!;
    }
}
