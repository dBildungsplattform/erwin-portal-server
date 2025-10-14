import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RollenmappingCreateUpdateBodyParams {
    @ApiProperty({
        description: 'The id of the service provider/LMS.',
    })
    @IsUUID()
    public serviceProviderId!: string;

    @ApiProperty({
        description: 'The id of the role to map to the LMS.',
    })
    @IsUUID()
    public rolleId!: string;

    @ApiProperty({
        description: 'The role in the LMS, to which the role should be mapped.',
    })
    @IsString()
    public mapToLmsRolle!: string;
}
