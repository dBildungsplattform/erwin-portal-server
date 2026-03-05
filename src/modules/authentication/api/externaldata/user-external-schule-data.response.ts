import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserExternalSchuleDataResponse {
    @ApiProperty()
    @IsString()
    public externalId!: string;

    @ApiProperty()
    @IsString()
    public name!: string;

    @ApiProperty()
    @IsString()
    public zugehoerigZu!: string;
}
