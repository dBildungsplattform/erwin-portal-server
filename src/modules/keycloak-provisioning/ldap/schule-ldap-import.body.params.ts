import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SchuleLdapImportBodyParams {
    @ApiProperty()
    @IsString()
    public schuleName!: string;

    @ApiProperty()
    @IsString()
    public zugehoerigZu!: string;

    @ApiProperty()
    @IsString()
    public ldapOu!: string; // externalId in Organisation
}
