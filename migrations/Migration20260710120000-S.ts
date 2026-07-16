import { Migration } from '@mikro-orm/migrations';

export class Migration20260710120000 extends Migration {
    async up(): Promise<void> {
        this.addSql('alter type "rollen_art_enum" add value if not exists \'PORTALADMINSEEDING\';');
    }

    override async down(): Promise<void> {
        // PostgreSQL does not support removing enum values
    }
}
