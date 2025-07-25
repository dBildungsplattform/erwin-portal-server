import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import {
    ServiceProviderKategorie,
    ServiceProviderSystem,
    ServiceProviderTarget,
} from '../domain/service-provider.enum.js';

export class CreateNewServiceProviderParams {
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    @ApiProperty({
        description: 'The ID of the service provider to be created.',
        required: true,
        nullable: false,
        type: String,
    })
    public readonly serviceProviderId!: string;

    @ApiProperty({
        description: 'The name of the service provider.',
        required: true,
        type: String,
    })
    public readonly name!: string;

    @ApiProperty({
        description: 'The target of the service provider.',
        required: true,
        enum: ServiceProviderTarget,
    })
    public readonly target!: ServiceProviderTarget;

    @ApiProperty({
        description: 'The URL of the service provider.',
        required: true,
        type: String,
    })
    public readonly url!: string;

    @ApiProperty({
        description: 'The category of the service provider.',
        required: true,
        enum: ServiceProviderKategorie,
    })
    public readonly kategorie!: ServiceProviderKategorie;

    @ApiProperty({
        description: 'The provided on schulstrukturknoten.',
        required: true,
        type: String,
    })
    public readonly providedOnSchulstrukturknoten!: string;

    @ApiProperty({
        description: 'The logo of the service provider.',
        required: false,
        type: Buffer,
    })
    public readonly logo?: Buffer;

    @ApiProperty({
        description: 'The MIME type of the logo.',
        required: false,
        type: String,
    })
    public readonly logoMimeType?: string;

    @ApiProperty({
        description: 'The Keycloak group associated with the service provider.',
        required: false,
        type: String,
    })
    public readonly keycloakGroup?: string;

    @ApiProperty({
        description: 'The Keycloak role associated with the service provider.',
        required: false,
        type: String,
    })
    public readonly keycloakRole?: string;

    @ApiProperty({
        description: 'The external system associated with the service provider.',
        required: true,
        type: ServiceProviderSystem,
    })
    public readonly externalSystem!: ServiceProviderSystem;

    @ApiProperty({
        description: 'Indicates if the service provider requires two-factor authentication.',
        required: true,
        type: Boolean,
    })
    public readonly requires2fa!: boolean;

    @ApiProperty({
        description: 'The VIDIS Angebot ID associated with the service provider.',
        required: false,
        type: String,
    })
    public readonly vidisAngebotId?: string;
}
