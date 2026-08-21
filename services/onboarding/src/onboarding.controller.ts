import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { OnboardingService } from "./onboarding.service.js";
import { RiskAnswersDto, SaveSectionDto, SaveStageDto, SECTION_KEYS, SelectProfessionalDto, type SectionKey } from "./dto.js";

@Controller("onboarding")
@Roles("BUSINESS_OWNER", "ADMIN")
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  @Get(":orgId")
  get(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.getOrCreate(p, orgId);
  }

  @Put(":orgId/stage/:stage")
  saveStage(
    @CurrentPrincipal() p: Principal,
    @Param("orgId") orgId: string,
    @Param("stage", ParseIntPipe) stage: number,
    @Body() dto: SaveStageDto,
  ) {
    const s = (stage === 2 ? 2 : stage === 3 ? 3 : 1) as 1 | 2 | 3;
    return this.svc.saveStage(p, orgId, s, dto.payload);
  }

  @Put(":orgId/section/:key")
  saveSection(
    @CurrentPrincipal() p: Principal,
    @Param("orgId") orgId: string,
    @Param("key") key: string,
    @Body() dto: SaveSectionDto,
  ) {
    if (!SECTION_KEYS.includes(key as SectionKey)) throw new BadRequestException("unknown_section");
    return this.svc.saveSection(p, orgId, key, dto.payload);
  }

  @Put(":orgId/risk")
  saveRisk(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: RiskAnswersDto) {
    return this.svc.saveRiskAnswers(p, orgId, dto);
  }

  @Post(":orgId/professional")
  async selectProfessional(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: SelectProfessionalDto) {
    await this.svc.selectProfessional(p, orgId, dto.professionalId);
    return { selected: dto.professionalId };
  }

  @Post(":orgId/complete")
  complete(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.complete(p, orgId);
  }
}
