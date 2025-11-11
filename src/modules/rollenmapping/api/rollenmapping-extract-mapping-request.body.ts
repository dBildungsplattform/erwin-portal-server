import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RollenMappingExtractMappingRequestBody {
    @ApiProperty({
        description: 'The id of the user that needs token authentication.',
    })
    @IsUUID()
    public userId: string;

    @ApiProperty({
        description: 'The id of the client the user is trying to access.',
    })
    @IsUUID()
    public clientId: string;

    @ApiProperty({
        description: 'The name of the client the user is trying to access.',
    })
    public clientName: string;

    public constructor(userId: string, clientId: string, clientName: string) {
        this.userId = userId;
        this.clientId = clientId;
        this.clientName = clientName;
    }
}
