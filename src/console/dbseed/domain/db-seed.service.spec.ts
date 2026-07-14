import { Test, TestingModule } from '@nestjs/testing';
import { DbSeedService } from './db-seed.service.js';
import {
    ConfigTestModule,
    DatabaseTestModule,
    DoFactory,
    LoggingTestModule,
    MapperTestModule,
} from '../../../../test/utils/index.js';
import fs from 'fs';
import { DataProviderFile } from '../file/data-provider-file.js';
import { PersonFactory } from '../../../modules/person/domain/person.factory.js';
import { PersonRepository } from '../../../modules/person/persistence/person.repository.js';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { DomainError, EntityNotFoundError } from '../../../shared/error/index.js';
import { faker } from '@faker-js/faker';
import { RolleRepo } from '../../../modules/rolle/repo/rolle.repo.js';
import { Rolle } from '../../../modules/rolle/domain/rolle.js';
import { RolleFactory } from '../../../modules/rolle/domain/rolle.factory.js';
import { ServiceProviderRepo } from '../../../modules/service-provider/repo/service-provider.repo.js';
import { ServiceProviderFactory } from '../../../modules/service-provider/domain/service-provider.factory.js';
import { KeycloakUserService, User } from '../../../modules/keycloak-administration/index.js';
import { Person } from '../../../modules/person/domain/person.js';
import { DBiamPersonenkontextService } from '../../../modules/personenkontext/domain/dbiam-personenkontext.service.js';
import { DbSeedReferenceRepo } from '../repo/db-seed-reference.repo.js';
import { ServiceProvider } from '../../../modules/service-provider/domain/service-provider.js';
import { GleicheRolleAnKlasseWieSchuleError } from '../../../modules/personenkontext/specification/error/gleiche-rolle-an-klasse-wie-schule.error.js';
import { PersonenkontextFactory } from '../../../modules/personenkontext/domain/personenkontext.factory.js';
import { Personenkontext } from '../../../modules/personenkontext/domain/personenkontext.js';
import { OrganisationRepository } from '../../../modules/organisation/persistence/organisation.repository.js';
import { KeycloakGroupRoleService } from '../../../modules/keycloak-administration/domain/keycloak-group-role.service.js';
import { Organisation } from '../../../modules/organisation/domain/organisation.js';
import { NameForOrganisationWithTrailingSpaceError } from '../../../modules/organisation/specification/error/name-with-trailing-space.error.js';
import { NameForRolleWithTrailingSpaceError } from '../../../modules/rolle/domain/name-with-trailing-space.error.js';
import { RollenMerkmal } from '../../../modules/rolle/domain/rolle.enums.js';
import { DBiamPersonenkontextRepoInternal } from '../../../modules/personenkontext/persistence/internal-dbiam-personenkontext.repo.js';

describe('DbSeedService', () => {
    let module: TestingModule;
    let dbSeedService: DbSeedService;
    let organisationRepositoryMock: DeepMocked<OrganisationRepository>;
    let rolleRepoMock: DeepMocked<RolleRepo>;
    let personRepoMock: DeepMocked<PersonRepository>;
    let serviceProviderRepoMock: DeepMocked<ServiceProviderRepo>;
    let personenkontextServiceMock: DeepMocked<DBiamPersonenkontextService>;
    let dbSeedReferenceRepoMock: DeepMocked<DbSeedReferenceRepo>;
    let kcUserService: DeepMocked<KeycloakUserService>;
    let personFactory: DeepMocked<PersonFactory>;
    let personenkontextRepoInternalMock: DeepMocked<DBiamPersonenkontextRepoInternal>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                LoggingTestModule,
                ConfigTestModule,
                MapperTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: false }),
            ],
            providers: [
                DbSeedService,
                RolleFactory,
                ServiceProviderFactory,
                PersonenkontextFactory,
                {
                    provide: DBiamPersonenkontextService,
                    useValue: createMock<DBiamPersonenkontextService>(),
                },
                {
                    provide: DbSeedReferenceRepo,
                    useValue: createMock<DbSeedReferenceRepo>(),
                },
                {
                    provide: PersonFactory,
                    useValue: createMock<PersonFactory>(),
                },
                {
                    provide: PersonRepository,
                    useValue: createMock<PersonRepository>(),
                },
                {
                    provide: DBiamPersonenkontextRepoInternal,
                    useValue: createMock<DBiamPersonenkontextRepoInternal>(),
                },
                {
                    provide: OrganisationRepository,
                    useValue: createMock<OrganisationRepository>(),
                },
                {
                    provide: RolleRepo,
                    useValue: createMock<RolleRepo>(),
                },
                {
                    provide: ServiceProviderRepo,
                    useValue: createMock<ServiceProviderRepo>(),
                },
                {
                    provide: KeycloakUserService,
                    useValue: createMock<KeycloakUserService>(),
                },
                {
                    provide: KeycloakGroupRoleService,
                    useValue: createMock<KeycloakGroupRoleService>(),
                },
            ],
        }).compile();
        dbSeedService = module.get(DbSeedService);
        organisationRepositoryMock = module.get(OrganisationRepository);
        rolleRepoMock = module.get(RolleRepo);
        personRepoMock = module.get(PersonRepository);
        serviceProviderRepoMock = module.get(ServiceProviderRepo);
        personenkontextServiceMock = module.get(DBiamPersonenkontextService);
        dbSeedReferenceRepoMock = module.get(DbSeedReferenceRepo);
        kcUserService = module.get(KeycloakUserService);
        personFactory = module.get(PersonFactory);
        personenkontextRepoInternalMock = module.get(DBiamPersonenkontextRepoInternal);
    });

    afterAll(async () => {
        await module.close();
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(dbSeedService).toBeDefined();
    });

    describe('readDataProvider', () => {
        describe('readDataProvider with one entity', () => {
            it('should have length 1', () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/00_data-provider.json`,
                    'utf-8',
                );
                const entities: DataProviderFile[] = dbSeedService.readDataProvider(fileContentAsStr);
                const entity: DataProviderFile | undefined = entities[0];
                const dataProvider: Partial<DataProviderFile> = {
                    id: '431d8433-759c-4dbe-aaab-00b9a781f467',
                };
                expect(entities).toHaveLength(1);
                expect(entity).toEqual(dataProvider);
            });
        });
    });

    describe('seedOrganisation', () => {
        describe('without administriertVon and zugehoerigZu', () => {
            it('should insert one entity in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/01_organisation.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);

                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });

        describe('with only nulls', () => {
            it('should insert one entity in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/00_organisation_with_only_nulls.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);

                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });

        describe('with overrideId', () => {
            it('should insert one entity in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/08_organisation_with_overrideId.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // existence check
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); // getReferencedOrganisation for administriertVon
                organisationRepositoryMock.findById.mockResolvedValueOnce(createMock<Organisation<true>>());
                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });

        describe('with existing administriertVon', () => {
            it('should not throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/01_organisation.json`,
                    'utf-8',
                );
                const parent: Organisation<true> = createMock<Organisation<true>>();
                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(parent);
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // existence check
                //USE MockResolved instead of MockRecolvedOnce because it's called for administriert and zugehoerigZu
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockResolvedValue(parent);

                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });

        describe('with existing zugehoerigZu', () => {
            it('should not throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/02_organisation.json`,
                    'utf-8',
                );
                const parent: Organisation<true> = createMock<Organisation<true>>();
                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(parent);
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // existence check
                //USE MockResolved instead of MockRecolvedOnce because it's called for administriert and zugehoerigZu
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockResolvedValue(parent); // mock get-SSK

                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });

        describe('with non existing administriertVon', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/04_missing_administriert-von.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);

                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });

        describe('with non existing zugehoerigZu', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/05_missing_zugehoerig-zu.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);

                organisationRepositoryMock.save.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });
        describe('kuerzel = root', () => {
            it('should create root orga', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/06_kuerzel-is-root.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);

                organisationRepositoryMock.saveSeedData.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });
        describe('Should throw error', () => {
            it('should throw NameForOrganisationWithTrailingSpaceError if OrganisationFactory.createNew returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/organisation/07_organisation_with_invalid_name.json`,
                    'utf-8',
                );
                const persistedOrganisation: Organisation<true> = DoFactory.createOrganisationAggregate(true);
                const parent: Organisation<true> = createMock<Organisation<true>>();
                organisationRepositoryMock.save.mockResolvedValueOnce(parent);
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // existence check
                //USE MockResolved instead of MockRecolvedOnce because it's called for administriert and zugehoerigZu
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockResolvedValue(parent);

                organisationRepositoryMock.save.mockResolvedValueOnce(persistedOrganisation);
                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).rejects.toThrow(
                    NameForOrganisationWithTrailingSpaceError,
                );
            });
        });
    });

    describe('seedRolle', () => {
        describe('with existing overrideId in seeding file', () => {
            it('should insert one entity in database with overrideId as id', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/09_rolle_with_override_id.json`,
                    'utf-8',
                );
                const persistedRolle: Rolle<true> = DoFactory.createRolle(true);

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); //mock: rolle not yet seeded
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced organisation
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock get-SSK

                rolleRepoMock.create.mockResolvedValueOnce(persistedRolle);
                await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow(EntityNotFoundError);
            });
        });

        describe('with existing organisation for administeredBySchulstrukturknoten and ID', () => {
            it('should insert one entity in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/04_rolle-with-existing-ssk.json`,
                    'utf-8',
                );
                const persistedRolle: Rolle<true> = DoFactory.createRolle(true);
                const serviceProviderMocked: ServiceProvider<true> = createMock<ServiceProvider<true>>();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced serviceProvider
                serviceProviderRepoMock.findById.mockResolvedValueOnce(serviceProviderMocked);
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock get-SSK

                rolleRepoMock.create.mockResolvedValueOnce(persistedRolle);
                await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow(EntityNotFoundError);
            });

            it('should resolve serviceProviderIds when creating new rolle', async () => {
                const fileContent: string = JSON.stringify({
                    entityName: 'Rolle',
                    entities: [
                        {
                            id: 10,
                            name: 'RolleWithSPs',
                            administeredBySchulstrukturknoten: 0,
                            rollenart: 'LERN',
                            merkmale: [],
                            systemrechte: [],
                            serviceProviderIds: [0, 1],
                            istTechnisch: false,
                        },
                    ],
                });
                const persistedRolle: Rolle<true> = DoFactory.createRolle(true);

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // findExistingReference — not yet seeded
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); // all other findUUID calls
                serviceProviderRepoMock.findById.mockResolvedValue(createMock<ServiceProvider<true>>());
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
                rolleRepoMock.create.mockResolvedValueOnce(persistedRolle);

                await expect(dbSeedService.seedRolle(fileContent)).resolves.not.toThrow();
                expect(serviceProviderRepoMock.findById).toHaveBeenCalledTimes(2);
                expect(rolleRepoMock.create).toHaveBeenCalled();
            });
        });

        describe('with existing organisation for administeredBySchulstrukturknoten but without ID', () => {
            it('should insert one entity in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/07_rolle_without_id.json`,
                    'utf-8',
                );
                const persistedRolle: Rolle<true> = DoFactory.createRolle(true);
                const serviceProviderMocked: ServiceProvider<true> = createMock<ServiceProvider<true>>();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced serviceProvider
                serviceProviderRepoMock.findById.mockResolvedValueOnce(serviceProviderMocked);
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock get-SSK

                rolleRepoMock.save.mockResolvedValueOnce(persistedRolle);
                await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow(EntityNotFoundError);
            });
        });

        describe('with non-existing organisation for administeredBySchulstrukturknoten', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/05_rolle-with-non-existing-ssk.json`,
                    'utf-8',
                );
                const serviceProviderMocked: ServiceProvider<true> = createMock<ServiceProvider<true>>();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // existence check
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced serviceProvider
                serviceProviderRepoMock.findById.mockResolvedValueOnce(serviceProviderMocked);

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockRejectedValueOnce(new EntityNotFoundError());

                await expect(dbSeedService.seedRolle(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });

        describe('with non-existing serviceProvider for in serviceProviderIds', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/06_rolle-with-non-existing-sp.json`,
                    'utf-8',
                );
                const persistedRolle: Rolle<true> = DoFactory.createRolle(true);

                rolleRepoMock.save.mockResolvedValueOnce(persistedRolle);
                await expect(dbSeedService.seedRolle(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });

        describe('should throw error', () => {
            it('should throw NameValidationError if OrganisationFactory.createNew returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/08_rolle-with-invalid-name.json`,
                    'utf-8',
                );
                const persistedRolle: Rolle<true> = DoFactory.createRolle(true);
                const serviceProviderMocked: ServiceProvider<true> = createMock<ServiceProvider<true>>();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced serviceProvider
                serviceProviderRepoMock.findById.mockResolvedValueOnce(serviceProviderMocked);
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID of referenced parent
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock get-SSK

                rolleRepoMock.save.mockResolvedValueOnce(persistedRolle);
                await expect(dbSeedService.seedRolle(fileContentAsStr)).rejects.toThrow(
                    NameForRolleWithTrailingSpaceError,
                );
            });
        });
    });

    describe('seedServiceProvider', () => {
        describe('seedServiceProvider with two entities', () => {
            it('should not throw an error', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/serviceProvider/03_service-provider.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID providedOnSchulstrukturknoten
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock get-SSK

                await expect(dbSeedService.seedServiceProvider(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });

            it('should not throw an error and use the overrideId as id', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/serviceProvider/04_service-provider-with-overrideId.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID providedOnSchulstrukturknoten
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock get-SSK

                await expect(dbSeedService.seedServiceProvider(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });
    });

    describe('seedPerson', () => {
        describe('person already exists in keycloak', () => {
            it('should delete the person and then create it again', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/existingPerson/02_person.json`,
                    'utf-8',
                );

                const person: Person<true> = createMock<Person<true>>();
                const existingUser: User<true> = User.construct<true>(
                    faker.string.uuid(),
                    'testusername',
                    'test@example.com',
                    faker.date.recent(),
                    {
                        ID_NEXTCLOUD: [faker.string.uuid()],
                        ID_ITSLEARNING: [faker.string.uuid()],
                    },
                    true,
                    {},
                );

                kcUserService.findOne.mockResolvedValueOnce({ ok: true, value: existingUser });
                kcUserService.delete.mockResolvedValueOnce({ ok: true, value: undefined });
                personRepoMock.create.mockResolvedValue(person);

                await dbSeedService.seedPerson(fileContentAsStr);

                await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow(EntityNotFoundError);
                expect(kcUserService.delete).toHaveBeenCalled();
            });
        });

        describe('when person has overrideId in seeding file', () => {
            it('should create person successfully without throwing', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/existingPerson/02_person_with_overrideId.json`,
                    'utf-8',
                );

                const person: Person<true> = createMock<Person<true>>();
                personFactory.createNew.mockResolvedValueOnce(createMock<Person<false>>());
                kcUserService.findOne.mockResolvedValueOnce({ ok: false, error: createMock<DomainError>() });
                personRepoMock.create.mockResolvedValue(person);

                await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow();
            });
        });
    });

    describe('seedTechnicalUser', () => {
        describe('no id in seeding', () => {
            it('should not create user', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/invalidPerson/06_technical-user.json`,
                    'utf-8',
                );

                const person: Person<false> = createMock<Person<true>>();
                const personPersisted: Person<true> = createMock<Person<true>>();
                personFactory.createNew.mockResolvedValueOnce(person);
                personRepoMock.create.mockResolvedValue(personPersisted);

                await dbSeedService.seedTechnicalUser(fileContentAsStr);

                expect(dbSeedReferenceRepoMock.create).toHaveBeenCalledTimes(0);
            });
        });

        describe('error in person factory', () => {
            it('should throw Domain Error', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/invalidPerson/06_technical-user.json`,
                    'utf-8',
                );

                // return DomainError
                personFactory.createNew.mockResolvedValueOnce(new NameForOrganisationWithTrailingSpaceError());

                await expect(dbSeedService.seedTechnicalUser(fileContentAsStr)).rejects.toThrow(
                    NameForOrganisationWithTrailingSpaceError,
                );
                expect(personRepoMock.create).toHaveBeenCalledTimes(0);
                expect(dbSeedReferenceRepoMock.create).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('seedPersonkontext', () => {
        describe('with violated Personenkontext Klasse specification', () => {
            it('should delete stale kontexte and retry, skip if retry also fails', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID in seeding-ref-table
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>()); // mock getReferencedPerson
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock getReferencedOrganisation
                rolleRepoMock.findById.mockResolvedValue(createMock<Rolle<true>>({ merkmale: [] })); // mock getReferencedRolle
                personenkontextRepoInternalMock.findByPersonIdOrgIdRolleId.mockResolvedValue(null); // not existing yet

                personenkontextServiceMock.checkSpecifications
                    .mockResolvedValueOnce(new GleicheRolleAnKlasseWieSchuleError()) // first check fails
                    .mockResolvedValueOnce(new GleicheRolleAnKlasseWieSchuleError()); // retry also fails
                personenkontextRepoInternalMock.findByPersonId.mockResolvedValueOnce([
                    createMock<Personenkontext<true>>(),
                ]); // stale kontexte found

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).resolves.not.toThrow();
                expect(personenkontextRepoInternalMock.delete).toHaveBeenCalled();
                expect(personenkontextRepoInternalMock.create).not.toHaveBeenCalled();
            });

            it('should delete stale kontexte and create when retry succeeds', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>());
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
                rolleRepoMock.findById.mockResolvedValue(createMock<Rolle<true>>({ merkmale: [] }));
                personenkontextRepoInternalMock.findByPersonIdOrgIdRolleId.mockResolvedValue(null);

                personenkontextServiceMock.checkSpecifications
                    .mockResolvedValueOnce(new GleicheRolleAnKlasseWieSchuleError()) // first check fails
                    .mockResolvedValueOnce(null); // retry succeeds
                personenkontextRepoInternalMock.findByPersonId.mockResolvedValueOnce([
                    createMock<Personenkontext<true>>(),
                ]);

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).resolves.not.toThrow();
                expect(personenkontextRepoInternalMock.delete).toHaveBeenCalled();
                expect(personenkontextRepoInternalMock.create).toHaveBeenCalled();
            });
        });

        describe('with Rolle with Befristung', () => {
            it('should insert one entity with Befristung', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID in seeding-ref-table
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>()); // mock getReferencedPerson
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock getReferencedOrganisation
                rolleRepoMock.findById.mockResolvedValue(
                    createMock<Rolle<true>>({ merkmale: [RollenMerkmal.BEFRISTUNG_PFLICHT] }),
                ); // mock getReferencedRolle
                personenkontextRepoInternalMock.findByPersonIdOrgIdRolleId.mockResolvedValue(null); // not existing yet

                personenkontextServiceMock.checkSpecifications.mockResolvedValueOnce(null);

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });

        describe('with overrideId', () => {
            it('should use the overrideId as id', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/06_personenkontext-with-overrideId.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID in seeding-ref-table
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>()); // mock getReferencedPerson
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>()); // mock getReferencedOrganisation
                rolleRepoMock.findById.mockResolvedValue(
                    createMock<Rolle<true>>({ merkmale: [RollenMerkmal.BEFRISTUNG_PFLICHT] }),
                ); // mock getReferencedRolle
                personenkontextRepoInternalMock.findByPersonIdOrgIdRolleId.mockResolvedValue(null); // not existing yet

                personenkontextServiceMock.checkSpecifications.mockResolvedValueOnce(null);

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).resolves.not.toThrow(
                    EntityNotFoundError,
                );
            });
        });
    });

    describe('seed methods skip already-seeded entities', () => {
        it('should skip organisation if reference already exists', async () => {
            const fileContentAsStr: string = fs.readFileSync(
                `./seeding/seeding-integration-test/all/01/01_organisation.json`,
                'utf-8',
            );
            dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());

            await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow();
            expect(organisationRepositoryMock.saveSeedData).not.toHaveBeenCalled();
        });

        it('should skip rolle if reference already exists', async () => {
            const fileContentAsStr: string = fs.readFileSync(
                `./seeding/seeding-integration-test/rolle/04_rolle-with-existing-ssk.json`,
                'utf-8',
            );
            dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());

            await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow();
            expect(rolleRepoMock.create).not.toHaveBeenCalled();
        });

        it('should skip service provider if reference already exists', async () => {
            const fileContentAsStr: string = fs.readFileSync(
                `./seeding/seeding-integration-test/all/01/03_service-provider.json`,
                'utf-8',
            );
            dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());

            await expect(dbSeedService.seedServiceProvider(fileContentAsStr)).resolves.not.toThrow();
            expect(serviceProviderRepoMock.create).not.toHaveBeenCalled();
        });

        it('should skip person if reference already exists', async () => {
            const fileContentAsStr: string = fs.readFileSync(
                `./seeding/seeding-integration-test/personenkontext/02_person.json`,
                'utf-8',
            );
            dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());

            await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow();
            expect(personRepoMock.create).not.toHaveBeenCalled();
        });

        it('should skip technical user if reference already exists', async () => {
            const fileContentAsStr: string = fs.readFileSync(
                `./seeding/seeding-integration-test/all/01/06_technical-user.json`,
                'utf-8',
            );
            dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());

            await expect(dbSeedService.seedTechnicalUser(fileContentAsStr)).resolves.not.toThrow();
            expect(personRepoMock.create).not.toHaveBeenCalled();
        });

        it('should skip personenkontext if it already exists', async () => {
            const fileContentAsStr: string = fs.readFileSync(
                `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                'utf-8',
            );
            dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
            personRepoMock.findById.mockResolvedValue(createMock<Person<true>>());
            organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
            rolleRepoMock.findById.mockResolvedValue(createMock<Rolle<true>>({ merkmale: [] }));
            personenkontextRepoInternalMock.findByPersonIdOrgIdRolleId.mockResolvedValueOnce(
                createMock<Personenkontext<true>>(),
            );

            await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).resolves.not.toThrow();
            expect(personenkontextServiceMock.checkSpecifications).not.toHaveBeenCalled();
            expect(personenkontextRepoInternalMock.create).not.toHaveBeenCalled();
        });
    });

    describe('getReferencedPerson', () => {
        describe('when person cannot be found via PersonRepository', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID was found via seeding-ref-table
                personRepoMock.findById.mockResolvedValue(undefined);
                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });
    });

    describe('getReferencedOrganisation', () => {
        describe('when organisation cannot be found via OrganisationRepository', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID for person, found via seeding-ref-table
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>());
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID for orga, found via seeding-ref-table
                organisationRepositoryMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });
    });

    describe('getReferencedRolle', () => {
        describe('when rolle cannot be found seeding-ref table', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID for person, found via seeding-ref-table
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>());
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); //mock UUID for orga, found via seeding-ref-table
                organisationRepositoryMock.findById.mockResolvedValueOnce(createMock<Organisation<true>>());
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); //mock UUID for rolle, found via seeding-ref-table

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });
        describe('seedPersonenkontext', () => {
            describe('when person UUID cannot be found', () => {
                it('should throw EntityNotFoundError', async () => {
                    const fileContentAsStr: string = fs.readFileSync(
                        `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                        'utf-8',
                    );

                    // Mock dbSeedReferenceRepo to return undefined for the person UUID
                    dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined);

                    await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).rejects.toThrow(
                        EntityNotFoundError,
                    );
                });
            });
        });

        describe('when rolle cannot be found via RolleRepository', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/05_personenkontext.json`,
                    'utf-8',
                );

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID for person, found via seeding-ref-table
                personRepoMock.findById.mockResolvedValue(createMock<Person<true>>());
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID for orga, found via seeding-ref-table
                organisationRepositoryMock.findById.mockResolvedValueOnce(createMock<Organisation<true>>());

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID for rolle, found via seeding-ref-table
                rolleRepoMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedPersonenkontext(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });
    });

    describe('getReferencedServiceProvider', () => {
        describe('when serviceProvider cannot be found via ServiceProviderRepository', () => {
            it('should throw EntityNotFoundError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/rolle/06_rolle-with-non-existing-sp.json`,
                    'utf-8',
                );

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // existence check
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); //mock UUID for SP was found via seeding-ref-table
                serviceProviderRepoMock.findById.mockResolvedValue(undefined);
                await expect(dbSeedService.seedRolle(fileContentAsStr)).rejects.toThrow(EntityNotFoundError);
            });
        });
    });

    describe('seedOrganisation', () => {
        describe('when updating existing entities', () => {
            it('should update organisation when reference exists and org is found', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/01_organisation.json`,
                    'utf-8',
                );
                const existingOrg: Organisation<true> = createMock<Organisation<true>>({
                    name: 'OldName',
                    kennung: 'OldKennung',
                });
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                organisationRepositoryMock.findById.mockResolvedValue(existingOrg);

                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow();
                expect(organisationRepositoryMock.save).toHaveBeenCalledWith(existingOrg);
                expect(organisationRepositoryMock.saveSeedData).not.toHaveBeenCalled();
            });

            it('should not call save when organisation UUID is not found in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/01_organisation.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                organisationRepositoryMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedOrganisation(fileContentAsStr)).resolves.not.toThrow();
                expect(organisationRepositoryMock.save).not.toHaveBeenCalled();
                expect(organisationRepositoryMock.saveSeedData).not.toHaveBeenCalled();
            });
        });
    });

    describe('seedRolle', () => {
        describe('when updating existing entities', () => {
            it('should update rolle when reference exists and rolle is found', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/04_rolle.json`,
                    'utf-8',
                );
                const existingRolle: Rolle<true> = createMock<Rolle<true>>({ name: 'OldRolleName' });
                const updatedRolle: Rolle<true> = createMock<Rolle<true>>();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                rolleRepoMock.findById.mockResolvedValue(existingRolle);
                serviceProviderRepoMock.findById.mockResolvedValue(createMock<ServiceProvider<true>>());
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
                rolleRepoMock.save.mockResolvedValue(updatedRolle);

                await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow();
                expect(rolleRepoMock.save).toHaveBeenCalled();
                expect(rolleRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not create new rolle when save returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/04_rolle.json`,
                    'utf-8',
                );
                const existingRolle: Rolle<true> = createMock<Rolle<true>>({ name: 'OldRolleName' });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                rolleRepoMock.findById.mockResolvedValue(existingRolle);
                serviceProviderRepoMock.findById.mockResolvedValue(createMock<ServiceProvider<true>>());
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
                rolleRepoMock.save.mockResolvedValue(new NameForRolleWithTrailingSpaceError());

                await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow();
                expect(rolleRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not call save or create when rolle UUID is not found in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/04_rolle.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                rolleRepoMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedRolle(fileContentAsStr)).resolves.not.toThrow();
                expect(rolleRepoMock.save).not.toHaveBeenCalled();
                expect(rolleRepoMock.create).not.toHaveBeenCalled();
            });
        });
    });

    describe('seedServiceProvider', () => {
        describe('when updating existing entities', () => {
            it('should update service provider when reference exists and SP is found', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/03_service-provider.json`,
                    'utf-8',
                );
                const existingSP: ServiceProvider<true> = createMock<ServiceProvider<true>>({
                    name: 'OldSPName',
                    url: 'https://old.example.com',
                });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                serviceProviderRepoMock.findById.mockResolvedValue(existingSP);
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());

                await expect(dbSeedService.seedServiceProvider(fileContentAsStr)).resolves.not.toThrow();
                expect(serviceProviderRepoMock.save).toHaveBeenCalled();
                expect(serviceProviderRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not call save or create when SP UUID is not found in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/03_service-provider.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                serviceProviderRepoMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedServiceProvider(fileContentAsStr)).resolves.not.toThrow();
                expect(serviceProviderRepoMock.save).not.toHaveBeenCalled();
                expect(serviceProviderRepoMock.create).not.toHaveBeenCalled();
            });
        });
    });

    describe('seedPerson', () => {
        describe('when updating existing entities', () => {
            it('should update person when reference exists and person is found', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/02_person.json`,
                    'utf-8',
                );
                const existingPerson: Person<true> = createMock<Person<true>>({
                    vorname: 'OldVorname',
                    familienname: 'OldFamilienname',
                    revision: '1',
                });
                existingPerson.update = jest.fn();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(existingPerson);
                personRepoMock.save.mockResolvedValue(existingPerson);

                await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow();
                expect(existingPerson.update).toHaveBeenCalled();
                expect(personRepoMock.save).toHaveBeenCalledWith(existingPerson);
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not save when person.update() returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/02_person.json`,
                    'utf-8',
                );
                const existingPerson: Person<true> = createMock<Person<true>>({
                    vorname: 'OldVorname',
                    familienname: 'OldFamilienname',
                    revision: '1',
                });
                existingPerson.update = jest.fn().mockReturnValue(new NameForOrganisationWithTrailingSpaceError());

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(existingPerson);

                await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow();
                expect(personRepoMock.save).not.toHaveBeenCalled();
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not create when personRepository.save() returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/02_person.json`,
                    'utf-8',
                );
                const existingPerson: Person<true> = createMock<Person<true>>({
                    vorname: 'OldVorname',
                    familienname: 'OldFamilienname',
                    revision: '1',
                });
                existingPerson.update = jest.fn();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(existingPerson);
                personRepoMock.save.mockResolvedValue(new NameForOrganisationWithTrailingSpaceError());

                await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow();
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not call save or create when person UUID is not found in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/personenkontext/02_person.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedPerson(fileContentAsStr)).resolves.not.toThrow();
                expect(personRepoMock.save).not.toHaveBeenCalled();
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });
        });
    });

    describe('seedTechnicalUser', () => {
        describe('when updating existing entities', () => {
            it('should update technical user when reference exists and person is found', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/06_technical-user.json`,
                    'utf-8',
                );
                const existingPerson: Person<true> = createMock<Person<true>>({
                    vorname: 'OldVorname',
                    familienname: 'OldFamilienname',
                    revision: '1',
                });
                existingPerson.update = jest.fn();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(existingPerson);
                personRepoMock.save.mockResolvedValue(existingPerson);

                await expect(dbSeedService.seedTechnicalUser(fileContentAsStr)).resolves.not.toThrow();
                expect(existingPerson.update).toHaveBeenCalled();
                expect(personRepoMock.save).toHaveBeenCalledWith(existingPerson);
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not save when person.update() returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/06_technical-user.json`,
                    'utf-8',
                );
                const existingPerson: Person<true> = createMock<Person<true>>({
                    vorname: 'OldVorname',
                    familienname: 'OldFamilienname',
                    revision: '1',
                });
                existingPerson.update = jest.fn().mockReturnValue(new NameForOrganisationWithTrailingSpaceError());

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(existingPerson);

                await expect(dbSeedService.seedTechnicalUser(fileContentAsStr)).resolves.not.toThrow();
                expect(personRepoMock.save).not.toHaveBeenCalled();
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not create when personRepository.save() returns DomainError', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/06_technical-user.json`,
                    'utf-8',
                );
                const existingPerson: Person<true> = createMock<Person<true>>({
                    vorname: 'OldVorname',
                    familienname: 'OldFamilienname',
                    revision: '1',
                });
                existingPerson.update = jest.fn();

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(existingPerson);
                personRepoMock.save.mockResolvedValue(new NameForOrganisationWithTrailingSpaceError());

                await expect(dbSeedService.seedTechnicalUser(fileContentAsStr)).resolves.not.toThrow();
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });

            it('should not call save or create when technical user UUID is not found in database', async () => {
                const fileContentAsStr: string = fs.readFileSync(
                    `./seeding/seeding-integration-test/all/01/06_technical-user.json`,
                    'utf-8',
                );
                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                personRepoMock.findById.mockResolvedValue(undefined);

                await expect(dbSeedService.seedTechnicalUser(fileContentAsStr)).resolves.not.toThrow();
                expect(personRepoMock.save).not.toHaveBeenCalled();
                expect(personRepoMock.create).not.toHaveBeenCalled();
            });
        });
    });

    describe('getEntityFileNames', () => {
        describe('getEntityFileNames in directory sql/seeding-integration-test', () => {
            it('should return all files in directory', () => {
                const entityFileNames: string[] = dbSeedService.getEntityFileNames(
                    'seeding-integration-test/all',
                    '01',
                );
                expect(entityFileNames).toHaveLength(7);
            });
        });
    });

    describe('getDirectories', () => {
        it('should return sub-directories', () => {
            const directories: string[] = dbSeedService.getDirectories('seeding-integration-test/all');
            expect(directories).toContain('01');
        });
    });

    describe('seedOrganisation', () => {
        describe('when updating existing organisation with administriertVon and zugehoerigZu', () => {
            it('should resolve parent references and update', async () => {
                const fileContent: string = JSON.stringify({
                    entityName: 'Organisation',
                    entities: [
                        {
                            id: 5,
                            kennung: 'NewKennung',
                            name: 'NewName',
                            kuerzel: 'NK',
                            typ: 'SCHULE',
                            administriertVon: 0,
                            zugehoerigZu: 1,
                        },
                    ],
                });
                const existingOrg: Organisation<true> = createMock<Organisation<true>>({
                    name: 'OldName',
                    kennung: 'OldKennung',
                });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid());
                organisationRepositoryMock.findById.mockResolvedValue(existingOrg);

                await expect(dbSeedService.seedOrganisation(fileContent)).resolves.not.toThrow();
                expect(organisationRepositoryMock.save).toHaveBeenCalledWith(existingOrg);
            });
        });
    });

    describe('seedServiceProvider', () => {
        describe('when service provider has no id', () => {
            it('should log error for non-referenceable entity', async () => {
                const fileContent: string = JSON.stringify({
                    entityName: 'ServiceProvider',
                    entities: [
                        {
                            name: 'TestSP',
                            target: 'URL',
                            url: 'https://example.com',
                            kategorie: 'UNTERRICHT',
                            providedOnSchulstrukturknoten: 0,
                            requires2fa: false,
                        },
                    ],
                });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValue(faker.string.uuid()); // getReferencedOrganisation
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
                serviceProviderRepoMock.create.mockResolvedValue(createMock<ServiceProvider<true>>());

                await expect(dbSeedService.seedServiceProvider(fileContent)).resolves.not.toThrow();
                expect(dbSeedReferenceRepoMock.create).not.toHaveBeenCalled();
            });
        });

        describe('when service provider has a numeric id and is new', () => {
            it('should create service provider and store reference', async () => {
                const fileContent: string = JSON.stringify({
                    entityName: 'ServiceProvider',
                    entities: [
                        {
                            id: 50,
                            name: 'NewSP',
                            target: 'URL',
                            url: 'https://new-sp.com',
                            kategorie: 'UNTERRICHT',
                            providedOnSchulstrukturknoten: 0,
                            requires2fa: false,
                        },
                    ],
                });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // findExistingReference — not yet seeded
                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(faker.string.uuid()); // getReferencedOrganisation
                organisationRepositoryMock.findById.mockResolvedValue(createMock<Organisation<true>>());
                serviceProviderRepoMock.create.mockResolvedValue(createMock<ServiceProvider<true>>());

                await expect(dbSeedService.seedServiceProvider(fileContent)).resolves.not.toThrow();
                expect(serviceProviderRepoMock.create).toHaveBeenCalled();
                expect(dbSeedReferenceRepoMock.create).toHaveBeenCalled();
            });
        });
    });

    describe('seedPerson', () => {
        describe('when personFactory.createNew returns a DomainError', () => {
            it('should throw the DomainError', async () => {
                const fileContent: string = JSON.stringify({
                    entityName: 'Person',
                    entities: [
                        {
                            id: 99,
                            username: 'testuser',
                            vorname: 'Test',
                            familienname: 'User',
                            password: 'test',
                        },
                    ],
                });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // findExistingReference
                personFactory.createNew.mockResolvedValueOnce(new NameForOrganisationWithTrailingSpaceError());

                await expect(dbSeedService.seedPerson(fileContent)).rejects.toThrow(
                    NameForOrganisationWithTrailingSpaceError,
                );
            });
        });

        describe('when person is created successfully with numeric id', () => {
            it('should persist person and create reference', async () => {
                const fileContent: string = JSON.stringify({
                    entityName: 'Person',
                    entities: [
                        {
                            id: 77,
                            username: 'newuser',
                            vorname: 'New',
                            familienname: 'User',
                            password: 'test',
                        },
                    ],
                });

                dbSeedReferenceRepoMock.findUUID.mockResolvedValueOnce(undefined); // findExistingReference
                personFactory.createNew.mockResolvedValueOnce(createMock<Person<false>>());
                kcUserService.findOne.mockResolvedValueOnce({ ok: false, error: createMock<DomainError>() });
                personRepoMock.create.mockResolvedValueOnce(DoFactory.createPerson(true));

                await expect(dbSeedService.seedPerson(fileContent)).resolves.not.toThrow();
                expect(dbSeedReferenceRepoMock.create).toHaveBeenCalled();
            });
        });
    });
});
