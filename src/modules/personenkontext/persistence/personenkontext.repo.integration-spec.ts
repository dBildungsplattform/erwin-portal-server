import { EntityManager, MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ConfigTestModule,
    DEFAULT_TIMEOUT_FOR_TESTCONTAINERS,
    DatabaseTestModule,
    DoFactory,
    LoggingTestModule,
    MapperTestModule,
} from '../../../../test/utils/index.js';
import { PersonenkontextDo } from '../domain/personenkontext.do.js';
import { PersonPersistenceMapperProfile } from '../../person/persistence/person-persistence.mapper.profile.js';
import { PersonEntity } from '../../person/persistence/person.entity.js';
import { PersonenkontextEntity } from './personenkontext.entity.js';
import { PersonenkontextRepo } from './personenkontext.repo.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { Rolle as RolleAggregate } from '../../rolle/domain/rolle.js';
import { RolleFactory } from '../../rolle/domain/rolle.factory.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { OrganisationRepository } from '../../organisation/persistence/organisation.repository.js';
import { EventModule } from '../../../core/eventbus/event.module.js';
import { mapAggregateToData } from '../../person/persistence/person.repository.js';
import { DomainError } from '../../../shared/error/domain.error.js';
import { Organisation } from '../../organisation/domain/organisation.js';

describe('PersonenkontextRepo', () => {
    let module: TestingModule;
    let sut: PersonenkontextRepo;
    let orm: MikroORM;
    let em: EntityManager;
    let rolleRepo: RolleRepo;
    let organisationRepo: OrganisationRepository;

    const createPersonEntity = (): PersonEntity => {
        const person: PersonEntity = em.create(PersonEntity, mapAggregateToData(DoFactory.createPerson(false)));
        return person;
    };

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                LoggingTestModule,
                ConfigTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
                MapperTestModule,
                EventModule,
                LoggingTestModule,
            ],
            providers: [
                PersonPersistenceMapperProfile,
                PersonenkontextRepo,
                RolleRepo,
                RolleFactory,
                ServiceProviderRepo,
                OrganisationRepository,
            ],
        }).compile();
        sut = module.get(PersonenkontextRepo);
        orm = module.get(MikroORM);
        em = module.get(EntityManager);
        rolleRepo = module.get(RolleRepo);
        organisationRepo = module.get(OrganisationRepository);

        await DatabaseTestModule.setupDatabase(orm);
    }, DEFAULT_TIMEOUT_FOR_TESTCONTAINERS);

    afterAll(async () => {
        await orm.close();
        await module.close();
    });

    beforeEach(async () => {
        await DatabaseTestModule.clearDatabase(orm);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(sut).toBeDefined();
    });

    describe('save', () => {
        describe('When referenced person entity exists', () => {
            it('should create a personenkontext', async () => {
                const newPerson: PersonEntity = createPersonEntity();
                const rolle: RolleAggregate<true> | DomainError = await rolleRepo.save(DoFactory.createRolle(false));
                if (rolle instanceof DomainError) throw Error();

                await em.persistAndFlush(newPerson);

                const organisation1: Organisation<true> = await organisationRepo.save(
                    DoFactory.createOrganisation(false),
                );

                const personEntity: PersonEntity = await em.findOneOrFail(PersonEntity, {
                    vorname: newPerson.vorname,
                });
                const newPersonenkontext: PersonenkontextDo<false> = DoFactory.createPersonenkontextDo(false, {
                    personId: personEntity.id,
                    rolleId: rolle.id,
                    organisationId: organisation1.id,
                });

                const savedPersonenkontext: Option<PersonenkontextDo<true>> = await sut.save(newPersonenkontext);

                await expect(
                    em.find(PersonenkontextEntity, { id: savedPersonenkontext ? savedPersonenkontext.id : null }),
                ).resolves.toHaveLength(1);
            });

            it('should update a personenkontext and should not create a new personenkontext', async () => {
                const newPerson: PersonEntity = createPersonEntity();
                const rolle: RolleAggregate<true> | DomainError = await rolleRepo.save(DoFactory.createRolle(false));
                if (rolle instanceof DomainError) throw Error();

                await em.persistAndFlush(newPerson);

                const organisation1: Organisation<true> = await organisationRepo.save(
                    DoFactory.createOrganisation(false),
                );

                const personEntity: PersonEntity = await em.findOneOrFail(PersonEntity, {
                    vorname: newPerson.vorname,
                });
                const newPersonenkontext: PersonenkontextDo<false> = DoFactory.createPersonenkontextDo(false, {
                    personId: personEntity.id,
                    rolleId: rolle.id,
                    organisationId: organisation1.id,
                });

                const savedPersonenkontext: Option<PersonenkontextDo<true>> = await sut.save(newPersonenkontext);
                if (!savedPersonenkontext) {
                    fail('Could not save personenkontext');
                }
                await expect(em.find(PersonenkontextEntity, {})).resolves.toHaveLength(1);
                await sut.save(savedPersonenkontext);
                await expect(em.find(PersonenkontextEntity, {})).resolves.toHaveLength(1);
            });

            it('should update a personenkontext with id and should not create a new personenkontext', async () => {
                const newPerson: PersonEntity = createPersonEntity();
                const rolle: RolleAggregate<true> | DomainError = await rolleRepo.save(DoFactory.createRolle(false));
                if (rolle instanceof DomainError) throw Error();

                await em.persistAndFlush(newPerson);

                const organisation1: Organisation<true> = await organisationRepo.save(
                    DoFactory.createOrganisation(false),
                );

                const personEntity: PersonEntity = await em.findOneOrFail(PersonEntity, {
                    vorname: newPerson.vorname,
                });
                const newPersonenkontext: PersonenkontextDo<true> = DoFactory.createPersonenkontextDo(true, {
                    personId: personEntity.id,
                    rolleId: rolle.id,
                    organisationId: organisation1.id,
                });

                const savedPersonenkontext: Option<PersonenkontextDo<true>> = await sut.save(newPersonenkontext);
                if (!savedPersonenkontext) {
                    fail('Could not save personenkontext');
                }
                await expect(em.find(PersonenkontextEntity, {})).resolves.toHaveLength(1);
                await sut.save(savedPersonenkontext);
                await expect(em.find(PersonenkontextEntity, {})).resolves.toHaveLength(1);
            });
        });
    });
});
