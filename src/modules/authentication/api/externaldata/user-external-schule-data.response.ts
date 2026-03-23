import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class UserExternalSchuleDataResponse {
    @ApiProperty()
    @IsString()
    public externalId?: string;

    @ApiProperty()
    @IsString()
    public name!: string;

    @ApiProperty()
    @IsString()
    public zugehoerigZu?: string;

    @ApiProperty()
    @IsUUID()
    public erwinId!: string;

    public constructor(schuleResponse: Partial<UserExternalSchuleDataResponse>) {
        this.externalId = schuleResponse.externalId;
        this.name = schuleResponse.name!;
        this.zugehoerigZu = schuleResponse.zugehoerigZu;
        this.erwinId = schuleResponse.erwinId!;
    }
}
