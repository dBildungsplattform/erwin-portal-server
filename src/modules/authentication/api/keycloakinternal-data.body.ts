import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KeycloakInternalDataBody {
    @ApiProperty({
        description: 'The Keycloak user ID of the user to be provisioned.',
    })
    @IsString()
    public keycloakUserId!: string;
}
