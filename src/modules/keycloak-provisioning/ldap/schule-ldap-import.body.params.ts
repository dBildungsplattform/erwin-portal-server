import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SchuleLdapImportBodyParams {
    @ApiProperty()
    @IsString()
    public name!: string;

    @ApiProperty()
    @IsString()
    public zugehoerigZu!: string;

    @ApiProperty()
    @IsString()
    public externalId!: string; // ldapOu
}
