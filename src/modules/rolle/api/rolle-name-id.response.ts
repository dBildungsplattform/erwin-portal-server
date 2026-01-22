import { ApiProperty } from '@nestjs/swagger';
import { Rolle } from '../domain/rolle.js';

export class RolleNameIdResponse {
    @ApiProperty()
    public id: string;

    @ApiProperty()
    public name: string;

    public constructor(rolle: Rolle<true>) {
        this.id = rolle.id;
        this.name = rolle.name;
    }
}
