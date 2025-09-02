import { RollenartController } from './rollenart.controller.js';
import { RollenartRepo } from '../repo/rollenart.repo.js';

describe('RollenartController', () => {
    let controller: RollenartController;
    let rollenartRepo: jest.Mocked<RollenartRepo>;

    beforeEach(() => {
        rollenartRepo = {
            getAllRollenarten: jest.fn(),
        } as unknown as jest.Mocked<RollenartRepo>;

        controller = new RollenartController(rollenartRepo);
    });

    describe('getAllLmsRollenarten', () => {
        it('should return all rollenarten from the repository', () => {
            const rollenarten: string[] = ['Admin', 'User', 'Manager'];
            rollenartRepo.getAllRollenarten.mockReturnValue(rollenarten);

            const result: string[] = controller.getAllLmsRollenarten();

            expect(result).toEqual(rollenarten);
            expect(rollenartRepo.getAllRollenarten).toHaveBeenCalledTimes(1);
        });

        it('should return an empty array if no rollenarten are found', () => {
            rollenartRepo.getAllRollenarten.mockReturnValue([]);

            const result: string[] = controller.getAllLmsRollenarten();

            expect(result).toEqual([]);
            expect(rollenartRepo.getAllRollenarten).toHaveBeenCalledTimes(1);
        });
    });
});
