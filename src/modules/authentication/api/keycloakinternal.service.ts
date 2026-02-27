import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';
import { PersonenkontextFactory } from '../../personenkontext/domain/personenkontext.factory.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { OrganisationExternalIdType, OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { Person, PersonCreationParams } from '../../person/domain/person.js';
import { PersonExternalIdType } from '../../person/domain/person.enums.js';
import { DomainError } from '../../../shared/error/index.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { Rolle } from '../../rolle/domain/rolle.js';
import { RolleFactory } from '../../rolle/domain/rolle.factory.js';
import { RollenArt } from '../../rolle/domain/rolle.enums.js';
import { ErwinLdapMappedRollenArt } from '../../rollenmapping/domain/lms-rollenarten.enums.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { DBiamPersonenkontextRepoInternal } from '../../personenkontext/persistence/internal-dbiam-personenkontext.repo.js';
import { PersonFactory } from '../../person/domain/person.factory.js';
import { OrganisationScope } from '../../organisation/persistence/organisation.scope.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';

@Injectable()
export class KeycloakInternalService {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly personRepository: PersonRepository,
        private readonly personFactory: PersonFactory,
        private readonly organisationRepository: OrganisationRepository,
        private readonly rolleFactory: RolleFactory,
        private readonly personenkontextFactory: PersonenkontextFactory,
        private readonly personenkontextService: PersonenkontextService,
        private readonly personenkontextRepo: DBiamPersonenkontextRepoInternal,
        private readonly rolleRepo: RolleRepo,
    ) {}

    public async createOrUpdateSchuleOrg(schuleLdapParams: SchuleLdapImportBodyParams): Promise<Organisation<true>> {
        this.logger.info('Schule Creation/Update Phase started');

        let persistedOrg: Organisation<true>;
        const externalIds: Partial<Record<OrganisationExternalIdType, string>> = {
            [OrganisationExternalIdType.LDAP]: schuleLdapParams.ldapOu,
        };

        const organisation: Organisation<true> | null = await this.organisationRepository.findOrganisationByExternalId(
            schuleLdapParams.ldapOu,
            OrganisationExternalIdType.LDAP,
        );

        if (!organisation) {
            this.logger.info('Schule does not exist, creating new schule organistation');

            const newOrg: Organisation<false> = this.createOrganisation(
                schuleLdapParams.schuleName,
                undefined,
                undefined,
                OrganisationsTyp.SCHULE,
                externalIds,
            );

            persistedOrg = await this.organisationRepository.save(newOrg);
            await this.organisationRepository.createExternalIdOrganisationMapping(
                schuleLdapParams.ldapOu,
                OrganisationExternalIdType.LDAP,
                persistedOrg,
            );
        } else {
            this.logger.info('Schule exists, updating existing schule organistation');

            this.assignSchuleParams(organisation, schuleLdapParams);
            persistedOrg = await this.organisationRepository.save(organisation);
        }
        this.logger.info('Schule saved successfully');

        return persistedOrg;
    }

    public async findOrCreateSchuleParentOrg(schuleOrg: Organisation<true>): Promise<Organisation<true>> {
        const organisationScope: OrganisationScope = new OrganisationScope();

        organisationScope.findBy({
            name: `${schuleOrg.externalIds?.LDAP} Parent Org`,
            typ: OrganisationsTyp.LAND,
        });

        const existingParentOrganisation: Organisation<true> | undefined =
            await this.findOrganisationByScope(organisationScope);

        if (!existingParentOrganisation) {
            this.logger.info('Creating schule parent org');

            const newOrg: Organisation<false> = this.createOrganisation(
                `${schuleOrg.externalIds?.LDAP} Parent Org`,
                undefined,
                undefined,
                OrganisationsTyp.LAND,
                {},
            );

            const persistedParentOrganization: Organisation<true> = await this.organisationRepository.save(newOrg);
            schuleOrg.zugehoerigZu = persistedParentOrganization.id;
            schuleOrg.administriertVon = persistedParentOrganization.id;
            await this.organisationRepository.save(schuleOrg);
            this.logger.info('Schule parent org successfully created');

            return persistedParentOrganization;
        } else {
            this.logger.info('Schule parent org exists, updating administriertVon and zugehoerigZu');

            schuleOrg.zugehoerigZu = existingParentOrganisation.id;
            schuleOrg.administriertVon = existingParentOrganisation.id;
            await this.organisationRepository.save(schuleOrg);
            this.logger.info('Schule Org fields saved successfully');

            return existingParentOrganisation;
        }
    }

    public async createOrUpdatePerson(personLdapParams: PersonLdapImportDataBody): Promise<Person<true>> {
        this.logger.info('Person Creation/Update Phase started');

        const existingPerson: Option<Person<true>> = await this.personRepository.findByKeycloakUserId(
            personLdapParams.keycloakUserId,
        );

        if (existingPerson) {
            this.logger.info('Person exists, updating existing person');
            this.assignPersonParams(existingPerson, personLdapParams);
            await this.personRepository.update(existingPerson);
            this.logger.info(`Person with KeycloakUserId ${personLdapParams.keycloakUserId} successfully updated`);

            return existingPerson;
        } else {
            this.logger.info('Person does not exists, creating new person');

            const creationParams: PersonCreationParams = {
                familienname: personLdapParams.lastName,
                vorname: personLdapParams.firstName,
                externalIds: { [PersonExternalIdType.LDAP]: personLdapParams.ldapDn },
            };
            const result: Person<false> | DomainError = await this.personFactory.createNew(creationParams);

            if (result instanceof DomainError) {
                this.logger.error('Failed to create new person', result);
                throw result;
            }

            const newPerson: Person<false> = result;
            const persistedPerson: Person<true> = (await this.personRepository.create(newPerson)) as Person<true>;

            this.logger.info(`Person with KeycloakUserId ${personLdapParams.keycloakUserId} successfully created`);

            return persistedPerson;
        }
    }

    public async findOrCreateRolle(
        parentOrg: Organisation<true>,
        paramsRolle: ErwinLdapMappedRollenArt,
    ): Promise<Rolle<true>> {
        this.logger.info('creating/finding new Rolle for the person in the schule org');

        let existingRollen: Option<Rolle<true>[]> = await this.rolleRepo.findByName(parentOrg.name as string, false);
        if (existingRollen?.length) {
            this.logger.info('Rolle exists, fetching');

            existingRollen = existingRollen?.filter((rolle: Rolle<true>) => {
                return (
                    rolle.administeredBySchulstrukturknoten === parentOrg.id &&
                    rolle.rollenart === this.mapToRollenArt(paramsRolle)
                );
            });

            if (existingRollen.length > 1)
                throw new ForbiddenException('More than one role exists for the parent organisation');
            else return existingRollen[existingRollen.length - 1] as Rolle<true>;
        } else {
            this.logger.info('Rolle does not exist, creating new oen');

            const resultingRolle: Rolle<false> | DomainError = this.rolleFactory.createNew(
                `${parentOrg.name}`,
                parentOrg.id,
                this.mapToRollenArt(paramsRolle),
                [],
                [],
                [],
                [],
                false,
            );

            if (resultingRolle instanceof DomainError) {
                this.logger.error('Failed to create new rolle', resultingRolle);
                throw resultingRolle;
            }
            const persistedRolle: Rolle<true> | DomainError = await this.rolleRepo.save(resultingRolle);

            if (persistedRolle instanceof DomainError) {
                this.logger.error('Failed to save new rolle');
                throw persistedRolle;
            }

            return persistedRolle;
        }
    }

    public async createOrUpdatePersonenkontextForSchule(
        schuleOrg: Organisation<true>,
        rolle: Rolle<true>,
        person: Person<true>,
    ): Promise<Personenkontext<true>> {
        this.logger.info(`PersonenKontext for Schule Creation/Update Phase Started`);
        const existingPersonenkontext: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!existingPersonenkontext) {
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                schuleOrg.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            return persistedPersonenkontext;
        } else {
            this.logger.info('Personenkontext for Schule exists, fetching the correct one');

            const personenkontext: Personenkontext<true> = await this.fetchPersonenkontextFromList(
                existingPersonenkontext,
                schuleOrg,
                rolle,
                person,
            );

            return personenkontext;
        }
    }

    public async createOrUpdateKlasse(
        klasseLdapParams: KlasseLdapImportBodyParams,
        schuleOrg: Organisation<true>,
    ): Promise<Organisation<true>> {
        this.logger.info('Klasse Creation/Update Phase started');

        let persistedOrg: Organisation<true>;
        const externalIds: Partial<Record<OrganisationExternalIdType, string>> = {
            [OrganisationExternalIdType.LDAP]: klasseLdapParams.ldapDn,
        };
        const organisation: Organisation<true> | null = await this.organisationRepository.findOrganisationByExternalId(
            klasseLdapParams.ldapDn,
            OrganisationExternalIdType.LDAP,
        );

        if (!organisation) {
            this.logger.info('Klasse does not exist, creating new klasse organistation');

            const newOrg: Organisation<false> = this.createOrganisation(
                klasseLdapParams.klasseName,
                schuleOrg.id,
                schuleOrg.id,
                OrganisationsTyp.KLASSE,
                externalIds,
            );

            persistedOrg = await this.organisationRepository.save(newOrg);
            await this.organisationRepository.createExternalIdOrganisationMapping(
                klasseLdapParams.ldapDn,
                OrganisationExternalIdType.LDAP,
                persistedOrg,
            );
        } else {
            this.logger.info('Klasse exists, updating existing klasse organistation');

            this.assignKlasseParams(organisation, klasseLdapParams);
            persistedOrg = await this.organisationRepository.save(organisation);
        }
        this.logger.info('Klasse saved successfully');

        return persistedOrg;
    }

    public async createPersonenkontextForKlasseIfNotExists(
        klasseOrg: Organisation<true>,
        rolle: Rolle<true>,
        person: Person<true>,
    ): Promise<Personenkontext<true>> {
        this.logger.info(`PersonenKontext for Klasse Creation Phase Started`);

        const existingPersonenkontext: Personenkontext<true>[] =
            await this.personenkontextService.findPersonenkontexteByPersonId(person.id);

        if (!existingPersonenkontext.length) {
            this.logger.info('Personenkontext for Klasse does not exist, creating a new one');
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                klasseOrg.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            return persistedPersonenkontext;
        } else {
            this.logger.info('Personenkontext for Klasse exists, fetching the correct one');

            const personenkontext: Personenkontext<true> = await this.fetchPersonenkontextFromList(
                existingPersonenkontext,
                klasseOrg,
                rolle,
                person,
            );

            return personenkontext;
        }
    }

    private assignSchuleParams(currentOrg: Organisation<true>, schuleLdapParams: SchuleLdapImportBodyParams): void {
        currentOrg.zugehoerigZu = schuleLdapParams.zugehoerigZu;
        currentOrg.name = schuleLdapParams.schuleName;
        if (currentOrg.externalIds) {
            currentOrg.externalIds.LDAP = schuleLdapParams.ldapOu;
        } else {
            currentOrg.externalIds = {
                [OrganisationExternalIdType.LDAP]: schuleLdapParams.ldapOu,
            };
        }
    }

    private assignPersonParams(existingPerson: Option<Person<true>>, personLdapParams: PersonLdapImportDataBody): void {
        existingPerson!.familienname = personLdapParams.lastName;
        existingPerson!.vorname = personLdapParams.firstName;
        existingPerson!.externalIds.LDAP = personLdapParams.ldapDn;
        existingPerson!.email = personLdapParams.email;
        existingPerson!.geburtsdatum = personLdapParams.geburtstag;
    }

    private assignKlasseParams(currentOrg: Organisation<true>, klasseLdapParams: KlasseLdapImportBodyParams): void {
        currentOrg.name = klasseLdapParams.klasseName;
        if (currentOrg.externalIds) {
            currentOrg.externalIds.LDAP = klasseLdapParams.ldapDn;
        } else {
            currentOrg.externalIds = { [OrganisationExternalIdType.LDAP]: klasseLdapParams.ldapDn };
        }
    }

    private mapToRollenArt(role: ErwinLdapMappedRollenArt): RollenArt {
        const mapErwinToRollen: Record<ErwinLdapMappedRollenArt, RollenArt> = {
            [ErwinLdapMappedRollenArt.LERN]: RollenArt.LERN,
            [ErwinLdapMappedRollenArt.LEHR]: RollenArt.LEHR,
            [ErwinLdapMappedRollenArt.LEIT]: RollenArt.LEIT,
        };

        return mapErwinToRollen[role];
    }

    private async findOrganisationByScope(
        organisationScope: OrganisationScope,
    ): Promise<Organisation<true> | undefined> {
        const [orgs]: Counted<Organisation<true>> = await this.organisationRepository.findBy(organisationScope);

        if (orgs.length === 0) {
            this.logger.error(`Organisation with scope ${organisationScope.findBy.toString()} not found`);
            return undefined;
        } else if (orgs.length === 1) {
            return orgs[orgs.length - 1] as Organisation<true>;
        } else {
            this.logger.error(`More than one organisation exists with scope ${organisationScope.findBy.toString()}`);
            throw new ForbiddenException(
                `More than one organisation exists with scope ${organisationScope.findBy.toString()}`,
            );
        }
    }

    private async fetchPersonenkontextFromList(
        existingPersonenkontext: Personenkontext<true>[],
        org: Organisation<true>,
        rolle: Rolle<true>,
        person: Person<true>,
    ): Promise<Personenkontext<true>> {
        const filteredPersonenkontext: Personenkontext<true>[] = existingPersonenkontext.filter(
            (personkontext: Personenkontext<true>) => {
                return personkontext.organisationId === org.id && personkontext.rolleId === rolle.id;
            },
        );

        if (filteredPersonenkontext.length === 0) {
            const personenkontext: Personenkontext<false> = this.personenkontextFactory.createNew(
                person.id,
                org.id,
                rolle.id,
            );
            const persistedPersonenkontext: Personenkontext<true> =
                await this.personenkontextRepo.save(personenkontext);

            return persistedPersonenkontext;
        } else if (filteredPersonenkontext.length > 1) {
            throw new ForbiddenException(
                'more than one personenkontext exists for this person with the same organisation and role',
            );
        } else {
            const personenkontext: Personenkontext<true> = filteredPersonenkontext[
                filteredPersonenkontext.length - 1
            ] as Personenkontext<true>;

            return personenkontext;
        }
    }

    private createOrganisation(
        orgName: string,
        administriertVon: string | undefined,
        zugehoerigZu: string | undefined,
        organisationType: OrganisationsTyp,
        externalIds: Partial<Record<OrganisationExternalIdType, string>>,
    ): Organisation<false> {
        return Organisation.createNew(
            administriertVon,
            zugehoerigZu,
            undefined,
            orgName,
            undefined,
            undefined,
            organisationType,
            undefined,
            undefined,
            undefined,
            false,
            undefined,
            externalIds,
        ) as Organisation<false>;
    }
}
