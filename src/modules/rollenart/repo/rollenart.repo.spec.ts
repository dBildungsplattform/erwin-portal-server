import { RollenartRepo } from './rollenart.repo.js';
import { SchulcloudRollenArt, MoodleRollenArt } from '../../rollenmapping/domain/lms-rollenarten.enums.js';

jest.mock('../../rollenmapping/domain/lms-rollenarten.enums', () => ({
    SchulcloudRollenArt: {
        LEHRER: 'Lehrer',
        SCHUELER: 'Schüler',
    },
    MoodleRollenArt: {
        DOZENT: 'Dozent',
        STUDENT: 'Student',
    },
}));

describe('RollenartRepo', () => {
    let repo: RollenartRepo;

    beforeEach(() => {
        repo = new RollenartRepo();
    });

    describe('getAllRollenarten', () => {
        it('should return all rollenarten from both enums', () => {
            const result: string[] = repo.getAllRollenarten();
            expect(result).toEqual(['Lehrer', 'Schüler', 'Dozent', 'Student']);
        });

        it('should return an array containing all SchulcloudRollenArt values', () => {
            const result: string[] = repo.getAllRollenarten();
            expect(result).toEqual(expect.arrayContaining(['Lehrer', 'Schüler']));
        });

        it('should return an array containing all MoodleRollenArt values', () => {
            const result: string[] = repo.getAllRollenarten();
            expect(result).toEqual(expect.arrayContaining(['Dozent', 'Student']));
        });

        it('should return an array with length equal to the sum of both enums', () => {
            const schulcloudLength: number = Object.values(SchulcloudRollenArt).length;
            const moodleLength: number = Object.values(MoodleRollenArt).length;
            const result: string[] = repo.getAllRollenarten();
            expect(result).toHaveLength(schulcloudLength + moodleLength);
        });
    });
});
