import { Controller, Get } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import { Roles } from "@vertofi/auth-guards";

@Controller("landing-contacts")
export class LandingAdminController {
  constructor(private readonly pg: PgService) {}

  @Roles("ADMIN")
  @Get()
  async getContacts() {
    const rows = await this.pg.query(
      `SELECT id, first_name, last_name, email, company, message, created_at
       FROM onboarding.landing_contacts
       ORDER BY created_at DESC`,
    );
    return rows;
  }
}
