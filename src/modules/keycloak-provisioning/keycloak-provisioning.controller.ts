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
import { ClassLogger } from '../../core/logging/class-logger.js';
import { OrganisationLdapImportService } from './organisation-ldap-import.service.js';
import { PersonLdapImportService } from './person-ldap-import.service.js';
import { RolleLdapImportService } from './rolle-ldap-import.service.js';
import { PersonenkontextLdapImportService } from './personenkontext-ldap-import.service.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { Person } from '../person/domain/person.js';
import { Rolle } from '../rolle/domain/rolle.js';

@ApiTags('Keycloakprovisioning')
@Controller({ path: 'keycloakprovisioning' })
export class KeycloakProvisioningController {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly organisationLdapImportService: OrganisationLdapImportService,
        private readonly personLdapImportService: PersonLdapImportService,
        private readonly rolleLdapImportService: RolleLdapImportService,
        private readonly personenkontextLdapImportService: PersonenkontextLdapImportService,
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
        const schuleOrg: Organisation<true> = await this.organisationLdapImportService.createOrUpdateSchuleOrg(
            params.schule,
        );
        const parentOrg: Organisation<true> = await this.organisationLdapImportService.findOrCreateSchuleParentOrg(
            schuleOrg,
            params.schule.zugehoerigZu,
        );
        const person: Person<true> = await this.personLdapImportService.createOrUpdatePerson(params.person);
        const newRolle: Rolle<true> = await this.rolleLdapImportService.findOrCreateRolle(parentOrg, params.rolle);

        await this.personenkontextLdapImportService.createOrUpdatePersonenkontextForSchule(schuleOrg, newRolle, person);

        const klasse: Organisation<true> = await this.organisationLdapImportService.createOrUpdateKlasse(
            params.klasse,
            schuleOrg,
        );

        await this.personenkontextLdapImportService.createPersonenkontextForKlasseIfNotExists(klasse, newRolle, person);

        this.logger.info('Ldap user processing completed for Keycloak UserID: ' + params.person.keycloakUserId);
    }
}
