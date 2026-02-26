import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserExeternalDataResponse } from './externaldata/user-externaldata.response.js';
import { ExternalPkData } from '../../personenkontext/persistence/dbiam-personenkontext.repo.js';
import { UserExternaldataWorkflowFactory } from '../domain/user-extenaldata.factory.js';
import { UserExternaldataWorkflowAggregate } from '../domain/user-extenaldata.workflow.js';
import { SchulConnexErrorMapper } from '../../../shared/error/schul-connex-error.mapper.js';
import { UserExternalDataWorkflowError } from '../../../shared/error/user-externaldata-workflow.error.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { Person } from '../../person/domain/person.js';
import { EntityNotFoundError } from '../../../shared/error/index.js';
import { AccessApiKeyGuard } from './access.apikey.guard.js';
import { Public } from './public.decorator.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { KeycloakInternalService } from './keycloakinternal.service.js';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { Rolle } from '../../rolle/domain/rolle.js';

type WithoutOptional<T> = {
    [K in keyof T]-?: T[K];
};

export type RequiredExternalPkData = WithoutOptional<ExternalPkData>;

@ApiTags('Keycloakinternal')
@Controller({ path: 'keycloakinternal' })
export class KeycloakInternalController {
    public constructor(
        private readonly userExternaldataWorkflowFactory: UserExternaldataWorkflowFactory,
        private readonly personRepository: PersonRepository,
        private readonly keycloakInternalService: KeycloakInternalService,
        private readonly logger: ClassLogger,
    ) {}

    /*
    Dieser Endpunkt fragt lediglich Daten ab ist allerdigs trotzdem als POST definiert, da:
    Die Url sollte keine Path oder Query Paremeters haben da Sie statisch in der Keycloak UI hinterlegt werden muss
    Trotzdem muss die Keycloak Sub übermittelt werden (Deshalb POST mit Body)
    */

    @Post('externaldata')
    @HttpCode(200)
    @Public()
    @UseGuards(AccessApiKeyGuard)
    @ApiOperation({ summary: 'External Data about requested in user.' })
    @ApiOkResponse({ description: 'Returns external Data about the requested user.', type: UserExeternalDataResponse })
    public async getExternalData(@Body() params: { sub: string }): Promise<UserExeternalDataResponse> {
        const person: Option<Person<true>> = await this.personRepository.findByKeycloakUserId(params.sub);
        if (!person) {
            throw SchulConnexErrorMapper.mapSchulConnexErrorToHttpException(
                SchulConnexErrorMapper.mapDomainErrorToSchulConnexError(
                    new EntityNotFoundError('Person with keycloak sub', params.sub),
                ),
            );
        }

        const workflow: UserExternaldataWorkflowAggregate = this.userExternaldataWorkflowFactory.createNew();
        await workflow.initialize(person.id);
        if (!workflow.person || !workflow.checkedExternalPkData) {
            throw SchulConnexErrorMapper.mapSchulConnexErrorToHttpException(
                SchulConnexErrorMapper.mapDomainErrorToSchulConnexError(
                    new UserExternalDataWorkflowError(
                        'UserExternaldataWorkflowAggregate has not been successfully initialized',
                    ),
                ),
            );
        }

        return UserExeternalDataResponse.createNew(workflow.person, workflow.checkedExternalPkData, workflow.contextID);
    }

    @Post('newldapuser')
    @HttpCode(201)
    @Public()
    @UseGuards(AccessApiKeyGuard)
    @ApiOperation({ summary: 'Send data for a new LDAP user' })
    @ApiCreatedResponse({
        description: 'User was created',
        type: LdapUserDataBodyParams,
    })
    public async onNewLdapUser(@Body() params: LdapUserDataBodyParams): Promise<void> {
        const schuleOrg: Organisation<true> = await this.keycloakInternalService.createOrUpdateSchuleOrg(
            params.schuleParams,
        );
        const parentOrg: Organisation<true> = await this.keycloakInternalService.findOrCreateSchuleParentOrg(schuleOrg);
        const person: Person<true> = await this.keycloakInternalService.createOrUpdatePerson(params.personParams);
        const newRolle: Rolle<true> = await this.keycloakInternalService.findOrCreateRolle(parentOrg, params.rolle);
        await this.keycloakInternalService.createOrUpdatePersonenkontextForSchule(schuleOrg, newRolle, person);
        const klasse: Organisation<true> = await this.keycloakInternalService.createOrUpdateKlasse(
            params.klasseParams,
            schuleOrg,
        );
        await this.keycloakInternalService.createPersonenkontextForKlasseIfNotExists(klasse, newRolle, person);
        this.logger.info('Ldap user processing completed for Keycloak UserID: ' + params.personParams.keycloakUserId);
    }
}
