import { Body, Controller, Post } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import { Public } from "@vertofi/auth-guards";

export interface LandingContactDto {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  message: string;
}

@Controller("landing-contact")
export class LandingController {
  constructor(private readonly pg: PgService) {}

  @Public()
  @Post()
  async createContact(@Body() dto: LandingContactDto) {
    await this.pg.query(
      `INSERT INTO onboarding.landing_contacts (first_name, last_name, email, company, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [dto.firstName, dto.lastName, dto.email, dto.company, dto.message],
    );
    return { ok: true };
  }
}
