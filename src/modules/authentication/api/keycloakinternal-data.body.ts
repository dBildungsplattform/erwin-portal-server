import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KeycloakInternalDataBody {
    @ApiProperty({
        description: 'The Keycloak sub (subject identifier) of the user.',
    })
    @IsString()
    public sub!: string;
}
