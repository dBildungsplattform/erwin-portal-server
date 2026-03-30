import { faker } from '@faker-js/faker/';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';
import { ConfigTestModule } from '../../../../test/utils/config-test.module.js';
import { DatabaseTestModule, MapperTestModule } from '../../../../test/utils/index.js';
import { LoggingTestModule } from '../../../../test/utils/logging-test.module.js';
import { PersonFactory } from '../../person/domain/person.factory.js';
import { Person } from '../../person/domain/person.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { PersonModule } from '../../person/person.module.js';
import { PersonenKontextModule } from '../../personenkontext/personenkontext.module.js';
import { RollenArt } from '../../rolle/domain/rolle.enums.js';
import { ServiceProviderModule } from '../../service-provider/service-provider.module.js';
import { UserExternalDataResponse } from './externaldata/user-externaldata.response.js';
import { KeycloakInternalController } from './keycloakinternal.controller.js';
import { KeycloakInternalService } from './keycloakinternal.service.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { DoFactory } from '../../../../test/utils/do-factory.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { Rolle } from '../../rolle/domain/rolle.js';
import { OrganisationModule } from '../../organisation/organisation.module.js';
import { RolleModule } from '../../rolle/rolle.module.js';
import { EntityNotFoundError } from '../../../shared/error/entity-not-found.error.js';

describe('KeycloakInternalController', () => {
    let module: TestingModule;
    let keycloakinternalController: KeycloakInternalController;
    let personRepoMock: DeepMocked<PersonRepository>;
    let personenkontextServiceMock: DeepMocked<PersonenkontextService>;
    let organisationRepositoryMock: DeepMocked<OrganisationRepository>;
    let rolleRepoMock: DeepMocked<RolleRepo>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigTestModule,
                LoggingTestModule,
                MapperTestModule,
                ServiceProviderModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
                PersonModule,
                PersonenKontextModule,
                OrganisationModule,
                RolleModule,
            ],
            providers: [KeycloakInternalController, KeycloakInternalService],
        })
            .overrideProvider(PersonRepository)
            .useValue(createMock<PersonRepository>())
            .overrideProvider(PersonenkontextService)
            .useValue(createMock<PersonenkontextService>())
            .overrideProvider(OrganisationRepository)
            .useValue(createMock<OrganisationRepository>())
            .overrideProvider(RolleRepo)
            .useValue(createMock<RolleRepo>())
            .overrideProvider(PersonFactory)
            .useValue(createMock<PersonFactory>())
            .compile();

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));

        keycloakinternalController = module.get(KeycloakInternalController);
        personRepoMock = module.get(PersonRepository);
        personenkontextServiceMock = module.get(PersonenkontextService);
        organisationRepositoryMock = module.get(OrganisationRepository);
        rolleRepoMock = module.get(RolleRepo);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await module.get(MikroORM).close();
        await module.close();
    });

    it('should be defined', () => {
        expect(keycloakinternalController).toBeDefined();
    });

    describe('externalData', () => {
        it('should return user external data', async () => {
            const keycloakSub: string = faker.string.uuid();
            const person: Person<true> = DoFactory.createPerson(true, {
                keycloakUserId: keycloakSub,
                externalIds: { LDAP: faker.string.uuid() },
                email: faker.internet.email(),
                vorname: faker.person.firstName(),
                familienname: faker.person.lastName(),
                geburtsdatum: faker.date.past(),
            });

            const schuleOrg: Organisation<true> = DoFactory.createOrganisation(true, {
                typ: OrganisationsTyp.SCHULE,
                externalIds: { LDAP: faker.string.uuid() },
                zugehoerigZu: faker.string.uuid(),
                name: faker.company.name(),
            });

            const klasseOrg: Organisation<true> = DoFactory.createOrganisation(true, {
                typ: OrganisationsTyp.KLASSE,
                externalIds: { LDAP: faker.string.uuid() },
                name: faker.company.name(),
            });

            const personenkontext: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                personId: person.id,
                rolleId: faker.string.uuid(),
                organisationId: schuleOrg.id,
            });

            const klassePersonenkontext: Personenkontext<true> = DoFactory.createPersonenkontext(true, {
                personId: person.id,
                rolleId: personenkontext.rolleId,
                organisationId: klasseOrg.id,
            });

            const rolle: Rolle<true> = DoFactory.createRolle(true, {
                id: personenkontext.rolleId,
                rollenart: RollenArt.LEHR,
            });

            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(person);
            personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([
                personenkontext,
                klassePersonenkontext,
            ]);
            rolleRepoMock.findById.mockResolvedValueOnce(rolle);
            organisationRepositoryMock.findById.mockResolvedValueOnce(schuleOrg).mockResolvedValueOnce(klasseOrg);

            const result: UserExternalDataResponse = await keycloakinternalController.getExternalData({
                keycloakUserId: keycloakSub,
            });

            expect(result).toBeInstanceOf(UserExternalDataResponse);
            expect(result.keycloakUserId).toEqual(keycloakSub);
            expect(result.personData.externalId).toEqual(person.externalIds.LDAP);
            expect(result.personData.vorname).toEqual(person.vorname);
            expect(result.personData.familienname).toEqual(person.familienname);
            expect(result.personData.email).toEqual(person.email);
            expect(result.personData.rolle).toEqual(RollenArt.LEHR);
            expect(result.personData.geburtsdatum).toEqual(person.geburtsdatum);
            expect(result.personData.erwinId).toEqual(person.id);
            expect(result.schuleData).toBeDefined();
            expect(result.schuleData?.externalId).toEqual(schuleOrg.externalIds?.LDAP);
            expect(result.schuleData?.name).toEqual(schuleOrg.name);
            expect(result.schuleData?.zugehoerigZu).toEqual(schuleOrg.zugehoerigZu);
            expect(result.schuleData?.erwinId).toEqual(schuleOrg.id);
            expect(result.klasseData).toHaveLength(1);
            expect(result.klasseData?.[0]?.externalId).toEqual(klasseOrg.externalIds?.LDAP);
            expect(result.klasseData?.[0]?.name).toEqual(klasseOrg.name);
            expect(result.klasseData?.[0]?.erwinId).toEqual(klasseOrg.id);
        });

        it('should throw error if person is not found', async () => {
            const keycloakSub: string = faker.string.uuid();
            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(null);

            await expect(keycloakinternalController.getExternalData({ keycloakUserId: keycloakSub })).rejects.toThrow(
                EntityNotFoundError,
            );
        });

        it('should throw error if no personenkontext entities are found', async () => {
            const keycloakSub: string = faker.string.uuid();
            const person: Person<true> = DoFactory.createPerson(true, {
                keycloakUserId: keycloakSub,
            });

            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(person);
            personenkontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValueOnce([]);

            await expect(keycloakinternalController.getExternalData({ keycloakUserId: keycloakSub })).rejects.toThrow(
                EntityNotFoundError,
            );
        });

        it('should throw ForbiddenException if keycloakUserId is empty', async () => {
            await expect(keycloakinternalController.getExternalData({ keycloakUserId: '' })).rejects.toThrow(
                'Sub must be initialized to provision user',
            );
        });
    });
});
