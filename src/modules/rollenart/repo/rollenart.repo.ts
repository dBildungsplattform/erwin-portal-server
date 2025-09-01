import {
    SchulcloudRollenArt,
    MoodleRollenArt,
} from '../../rollenmapping/domain/lms-rollenarten.enums.js';

export class RollenartRepo {
    public getAllRollenarten(): string[] {
        return [...Object.values(SchulcloudRollenArt), ...Object.values(MoodleRollenArt)];
    }
}
