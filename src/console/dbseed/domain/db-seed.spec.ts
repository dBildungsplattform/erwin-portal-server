import { faker } from '@faker-js/faker';
import { DbSeed } from './db-seed.js';
import { DbSeedStatus } from '../repo/db-seed.entity.js';

describe('DbSeed', () => {
    describe('construct', () => {
        it('should construct a DbSeed with all fields', () => {
            const hash: string = faker.string.alphanumeric(64);
            const executedAt: Date = faker.date.recent();
            const path: string = '01/01_data-provider.json';
            const failureReason: string = 'some error';

            const result: DbSeed<boolean> = DbSeed.construct(hash, executedAt, DbSeedStatus.DONE, path, failureReason);

            expect(result).toBeInstanceOf(DbSeed);
            expect(result.hash).toBe(hash);
            expect(result.executedAt).toBe(executedAt);
            expect(result.status).toBe(DbSeedStatus.DONE);
            expect(result.path).toBe(path);
            expect(result.failureReason).toBe(failureReason);
        });

        it('should construct a DbSeed without optional fields', () => {
            const hash: string = faker.string.alphanumeric(64);
            const executedAt: Date = faker.date.recent();

            const result: DbSeed<boolean> = DbSeed.construct(hash, executedAt, DbSeedStatus.STARTED);

            expect(result).toBeInstanceOf(DbSeed);
            expect(result.path).toBeUndefined();
            expect(result.failureReason).toBeUndefined();
        });
    });

    describe('createNew', () => {
        it('should create a new DbSeed with STARTED status', () => {
            const hash: string = faker.string.alphanumeric(64);
            const path: string = '01/02_person.json';

            const result: DbSeed<false> = DbSeed.createNew(hash, DbSeedStatus.STARTED, path);

            expect(result).toBeInstanceOf(DbSeed);
            expect(result.hash).toBe(hash);
            expect(result.executedAt).toBeUndefined();
            expect(result.status).toBe(DbSeedStatus.STARTED);
            expect(result.path).toBe(path);
            expect(result.failureReason).toBeUndefined();
        });
    });

    describe('setDone', () => {
        it('should set status to DONE', () => {
            const dbSeed: DbSeed<false> = DbSeed.createNew(faker.string.alphanumeric(64), DbSeedStatus.STARTED);

            dbSeed.setDone();

            expect(dbSeed.status).toBe(DbSeedStatus.DONE);
        });
    });

    describe('setFailed', () => {
        it('should set status to FAILED and store the reason', () => {
            const dbSeed: DbSeed<false> = DbSeed.createNew(faker.string.alphanumeric(64), DbSeedStatus.STARTED);
            const reason: string = 'Error: Something went wrong\n    at Object.<anonymous>';

            dbSeed.setFailed(reason);

            expect(dbSeed.status).toBe(DbSeedStatus.FAILED);
            expect(dbSeed.failureReason).toBe(reason);
        });

        it('should set status to FAILED with undefined reason when not provided', () => {
            const dbSeed: DbSeed<false> = DbSeed.createNew(faker.string.alphanumeric(64), DbSeedStatus.STARTED);

            dbSeed.setFailed();

            expect(dbSeed.status).toBe(DbSeedStatus.FAILED);
            expect(dbSeed.failureReason).toBeUndefined();
        });
    });
});
