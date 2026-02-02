import { ApiProperty } from '@nestjs/swagger';
import { Rolle } from '../domain/rolle.js';

export class RollenMappingRolleResponse {
    @ApiProperty()
    public id: string;

    @ApiProperty()
    public name: string;

    @ApiProperty()
    public rollenart: string;

    public constructor(rolle: Rolle<true>) {
        this.id = rolle.id;
        this.name = rolle.name;
        this.rollenart = rolle.rollenart;
    }
}
