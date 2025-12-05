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
import { DomainError, EntityNotFoundError } from '../../../shared/error/index.js';
import { AccessApiKeyGuard } from './access.apikey.guard.js';
import { Public } from './public.decorator.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { PersonFactory } from '../../person/domain/person.factory.js';

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
        private readonly personFactory: PersonFactory,
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
                        'UserExternaldataWorkflowAggregate has not been successfull initialized',
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
        console.log(params);

        const existingPerson: Option<Person<true>> = await this.personRepository.findByKeycloakUserId(
            params.keycloakUserId,
        );

        let personToSave: Person<boolean>;
        if (existingPerson) {
            existingPerson.familienname = params.lastName;
            existingPerson.vorname = params.firstName;
            existingPerson.externalIds.LDAP = params.ldapId;
            existingPerson.username = params.userName;
            personToSave = existingPerson;
        } else {
            const person: Person<false> | DomainError = await this.personFactory.createNew({
                familienname: params.lastName,
                vorname: params.firstName,
                externalIds: { LDAP: params.ldapId },
                username: params.userName,
            });

            if (person instanceof DomainError) {
                throw person;
            }

            person.keycloakUserId = params.keycloakUserId;
            personToSave = person;
        }

        await this.personRepository.save(personToSave);
    }
}
