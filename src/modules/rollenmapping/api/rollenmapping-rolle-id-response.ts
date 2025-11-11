export class RollenMappingRolleIdResponse {
    public userId: string;

    public mapToLmsRolle: string;

    public constructor(userId: string, mapToLmsRolle: string) {
        this.userId = userId;
        this.mapToLmsRolle = mapToLmsRolle;
    }
}
