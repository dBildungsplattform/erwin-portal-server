import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RollenMappingExtractMappingRequestBody {
    @ApiProperty({
        description: 'The keycloakUserId of the user that needs token authentication.',
    })
    @IsUUID()
    public keycloakUserId!: string;

    @ApiProperty({
        description: 'The name of the client the user is trying to access.',
    })
    @IsString()
    public clientName!: string;
}
