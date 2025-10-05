import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Competitor } from "./entities/competitors.entity";
import { CompetitorsService } from "./competitor.service";

@Module({
  imports: [TypeOrmModule.forFeature([Competitor])],
  providers: [CompetitorsService],
})
export class CompetitorsModule { }
