import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { AccessApiKeyGuard } from '../authentication/api/access.apikey.guard.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { KeycloakProvisioningService } from './keycloak-provisioning.service.js';
import { ClassLogger } from '../../core/logging/class-logger.js';

@ApiTags('Keycloakprovisioning')
@Controller({ path: 'keycloakprovisioning' })
export class KeycloakProvisioningController {
    public constructor(
        private readonly keycloakProvisioningService: KeycloakProvisioningService,
        private readonly logger: ClassLogger,
    ) {}

    @Post('newldapuser')
    @HttpCode(201)
    @Public()
    @UseGuards(AccessApiKeyGuard)
    @ApiOperation({ summary: 'Send data for a new LDAP user' })
    @ApiCreatedResponse({
        description: 'User was created',
        type: LdapUserDataBodyParams,
    })
    @ApiOkResponse({ description: 'Ldap User Processing Successfully Completed', type: LdapUserDataBodyParams })
    @ApiForbiddenResponse({ description: 'Forbidden Operation or Argument' })
    @ApiInternalServerErrorResponse({ description: 'Internal Server Error while Saving Ldap User' })
    public async onNewLdapUser(@Body() params: LdapUserDataBodyParams): Promise<void> {
        await this.keycloakProvisioningService.importLdapUser(params);

        this.logger.info('Ldap user processing completed for Keycloak UserID: ' + params.person.keycloakUserId);
    }
}
