import { Migration } from '@mikro-orm/migrations';

export class Migration20260709160000 extends Migration {
    async up(): Promise<void> {
        this.addSql('alter table "seeding" add column "failure_reason" text null;');
    }

    override async down(): Promise<void> {
        this.addSql('alter table "seeding" drop column "failure_reason";');
    }
}
