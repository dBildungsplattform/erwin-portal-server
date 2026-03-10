import { Migration } from '@mikro-orm/migrations';

export class Migration20260227130000 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter type "service_provider_target_enum" add value if not exists \'SELF\';');
  }

  override async down(): Promise<void> {
    // no-op: enum values cannot be removed easily in PostgreSQL
  }

}
