import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { MikroORM } from '@mikro-orm/core';
import { Mapper } from '@automapper/core';
import { getMapperToken } from '@automapper/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import fs from 'fs';
import { DbSeedConsole } from './db-seed.console.js';
import { DbSeedService } from './domain/db-seed.service.js';
import { DbSeedRepo } from './repo/db-seed.repo.js';
import { DbSeed } from './domain/db-seed.js';
import { DbSeedStatus } from './repo/db-seed.entity.js';
import { ClassLogger } from '../../core/logging/class-logger.js';

jest.mock('fs');

describe('DbSeedConsole', () => {
    let console: DbSeedConsole;
    let loggerMock: DeepMocked<ClassLogger>;
    let dbSeedServiceMock: DeepMocked<DbSeedService>;
    let dbSeedRepoMock: DeepMocked<DbSeedRepo>;
    let ormMock: DeepMocked<MikroORM>;

    const directory: string = 'test-dir';
    const subDir: string = '01';
    const entityFileName: string = '01_organisation.json';

    const fileContent: string = JSON.stringify({
        entityName: 'Organisation',
        entities: [{ name: 'Test Org' }],
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DbSeedConsole,
                {
                    provide: MikroORM,
                    useValue: createMock<MikroORM>(),
                },
                {
                    provide: ClassLogger,
                    useValue: createMock<ClassLogger>(),
                },
                {
                    provide: DbSeedService,
                    useValue: createMock<DbSeedService>(),
                },
                {
                    provide: DbSeedRepo,
                    useValue: createMock<DbSeedRepo>(),
                },
                {
                    provide: getMapperToken(),
                    useValue: createMock<Mapper>(),
                },
            ],
        }).compile();

        console = module.get(DbSeedConsole);
        loggerMock = module.get(ClassLogger);
        dbSeedServiceMock = module.get(DbSeedService);
        dbSeedRepoMock = module.get(DbSeedRepo);
        ormMock = module.get(MikroORM);
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('readAndProcessEntityFile (via run)', () => {
        beforeEach(() => {
            dbSeedServiceMock.getDirectories.mockReturnValue([subDir]);
            dbSeedServiceMock.getEntityFileNames.mockReturnValue([entityFileName]);
            jest.spyOn(fs, 'readFileSync').mockReturnValue(fileContent);
            ormMock.em.flush = jest.fn().mockResolvedValue(undefined);
        });

        it('should retry file when previous execution failed', async () => {
            const failedSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date('2024-01-01'),
                DbSeedStatus.FAILED,
                `${subDir}/${entityFileName}`,
                undefined,
            );
            dbSeedRepoMock.findById.mockResolvedValueOnce(failedSeed);
            dbSeedServiceMock.seedOrganisation.mockResolvedValueOnce(undefined);

            await console.run([directory]);

            expect(loggerMock.warning).toHaveBeenCalledWith(expect.stringContaining('Reason: unknown'));
            expect(dbSeedRepoMock.update).toHaveBeenCalled();
            expect(dbSeedServiceMock.seedOrganisation).toHaveBeenCalledWith(fileContent);
        });

        it('should re-process file when previous execution succeeded', async () => {
            const doneSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date('2024-01-01'),
                DbSeedStatus.DONE,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.findById.mockResolvedValueOnce(doneSeed);
            dbSeedServiceMock.seedOrganisation.mockResolvedValueOnce(undefined);

            await console.run([directory]);

            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('Re-processing'));
            expect(dbSeedRepoMock.update).toHaveBeenCalled();
        });

        it('should create new seed and process file when no previous record exists', async () => {
            dbSeedRepoMock.findById.mockResolvedValueOnce(null);
            const createdSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date(),
                DbSeedStatus.STARTED,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.create.mockResolvedValueOnce(createdSeed);
            dbSeedServiceMock.seedOrganisation.mockResolvedValueOnce(undefined);

            await console.run([directory]);

            expect(dbSeedRepoMock.create).toHaveBeenCalled();
            expect(dbSeedServiceMock.seedOrganisation).toHaveBeenCalledWith(fileContent);
            expect(dbSeedRepoMock.update).toHaveBeenCalled();
        });

        it('should mark seed as failed and rethrow when processing throws', async () => {
            dbSeedRepoMock.findById.mockResolvedValueOnce(null);
            const createdSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date(),
                DbSeedStatus.STARTED,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.create.mockResolvedValueOnce(createdSeed);
            const processError: string = 'seed processing failed';
            dbSeedServiceMock.seedOrganisation.mockRejectedValueOnce(processError);

            await expect(console.run([directory])).rejects.toBe(processError);

            expect(dbSeedRepoMock.update).toHaveBeenCalled();
            expect(dbSeedRepoMock.forkEntityManager).toHaveBeenCalled();
        });

        it('should use error stack when processing throws an Error', async () => {
            dbSeedRepoMock.findById.mockResolvedValueOnce(null);
            const createdSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date(),
                DbSeedStatus.STARTED,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.create.mockResolvedValueOnce(createdSeed);
            const processError: Error = new Error('seed processing failed');
            processError.stack = undefined;
            dbSeedServiceMock.seedOrganisation.mockRejectedValueOnce(processError);

            await expect(console.run([directory])).rejects.toThrow(processError);

            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('seed processing failed'));
        });

        it('should mark existing seed as failed and rethrow when re-processing throws', async () => {
            const existingSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date('2024-01-01'),
                DbSeedStatus.DONE,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.findById.mockResolvedValueOnce(existingSeed);
            const processError: Error = new Error('re-processing failed');
            dbSeedServiceMock.seedOrganisation.mockRejectedValueOnce(processError);

            await expect(console.run([directory])).rejects.toThrow(processError);

            expect(dbSeedRepoMock.forkEntityManager).toHaveBeenCalled();
            expect(dbSeedRepoMock.update).toHaveBeenCalled();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('re-processing failed'));
        });

        it('should use String(err) when existing seed re-processing throws a non-Error', async () => {
            const existingSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date('2024-01-01'),
                DbSeedStatus.DONE,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.findById.mockResolvedValueOnce(existingSeed);
            const processError: string = 'non-error string thrown';
            dbSeedServiceMock.seedOrganisation.mockRejectedValueOnce(processError);

            await expect(console.run([directory])).rejects.toBe(processError);

            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('non-error string thrown'));
        });

        it('should use err.message when existing seed throws Error without stack', async () => {
            const existingSeed: DbSeed<true> = DbSeed.construct<true>(
                'somehash',
                new Date('2024-01-01'),
                DbSeedStatus.DONE,
                `${subDir}/${entityFileName}`,
            );
            dbSeedRepoMock.findById.mockResolvedValueOnce(existingSeed);
            const processError: Error = new Error('no stack error');
            processError.stack = undefined;
            dbSeedServiceMock.seedOrganisation.mockRejectedValueOnce(processError);

            await expect(console.run([directory])).rejects.toThrow(processError);

            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('no stack error'));
        });
    });
});
