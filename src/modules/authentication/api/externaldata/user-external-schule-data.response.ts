import { ApiProperty } from '@nestjs/swagger';

export class UserExternalSchuleDataResponse {
    @ApiProperty()
    public externalId?: string;

    @ApiProperty()
    public name!: string;

    @ApiProperty()
    public zugehoerigZu?: string;

    @ApiProperty()
    public erwinId!: string;

    public constructor(schuleResponse: Partial<UserExternalSchuleDataResponse>) {
        this.externalId = schuleResponse.externalId;
        this.name = schuleResponse.name!;
        this.zugehoerigZu = schuleResponse.zugehoerigZu;
        this.erwinId = schuleResponse.erwinId!;
    }
}
