import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Repository } from 'typeorm';
import { PaginationDto, PaginatedResponse } from './dto/pagination.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Contest, ContestStatus } from '../contests/entities/contests.entity';
import { CampaignStatus } from '../campaigns/entities/campaign.entity';
import { UsersService } from '../users/users.service';
import { ContestsQueryService } from '../contests/contests-query.service';
import { PaintingsService } from '../paintings/paintings.service';
import { VotesService } from '../votes/votes.service';
import { AwardsService } from '../awards/awards.service';
import { CompetitorsService } from '../competitors/competitor.service';
import { ExhibitionsService } from '../exhibitions/exhibitions.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { Criteria } from '../paintings/entities/criteria.entity';
import { CreateCriteriaDto } from './dto/create-criteria.dto';
import { UpdateCriteriaDto } from './dto/update-criteria.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly contestsQueryService: ContestsQueryService,
    private readonly paintingsService: PaintingsService,
    private readonly votesService: VotesService,
    private readonly awardsService: AwardsService,
    private readonly competitorsService: CompetitorsService,
    private readonly exhibitionsService: ExhibitionsService,
    private readonly campaignsService: CampaignsService,
    @InjectRepository(Criteria)
    private readonly criteriaRepository: Repository<Criteria>,
  ) {}

  async createCriteria(createCriteriaDto: CreateCriteriaDto) {
    const criteria = this.criteriaRepository.create(createCriteriaDto);
    const savedCriteria = await this.criteriaRepository.save(criteria);

    return {
      success: true,
      message: 'Criteria created successfully',
      data: savedCriteria,
    };
  }

  async getAllCriteria() {
    const criteria = await this.criteriaRepository.find({
      order: {
        id: 'ASC',
      },
    });

    return {
      success: true,
      data: criteria,
    };
  }

  async getCriteriaById(id: number) {
    const criteria = await this.criteriaRepository.findOne({
      where: { id },
    });

    if (!criteria) {
      throw new NotFoundException('Criteria not found');
    }

    return {
      success: true,
      data: criteria,
    };
  }

  async updateCriteria(id: number, updateCriteriaDto: UpdateCriteriaDto) {
    const criteria = await this.criteriaRepository.findOne({
      where: { id },
    });

    if (!criteria) {
      throw new NotFoundException('Criteria not found');
    }

    Object.assign(criteria, updateCriteriaDto);
    const updatedCriteria = await this.criteriaRepository.save(criteria);

    return {
      success: true,
      message: 'Criteria updated successfully',
      data: updatedCriteria,
    };
  }

  async deleteCriteria(id: number) {
    const criteria = await this.criteriaRepository.findOne({
      where: { id },
    });

    if (!criteria) {
      throw new NotFoundException('Criteria not found');
    }

    await this.criteriaRepository.remove(criteria);

    return {
      success: true,
      message: 'Criteria deleted successfully',
    };
  }

  async findAllCompetitors(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10 } = paginationDto;
    const [competitors, total] = await this.usersService.findAndCountAccounts(
      page,
      limit,
      UserRole.COMPETITOR,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: competitors,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getAllAccounts(
    paginationDto: PaginationDto,
    role?: string,
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10 } = paginationDto;
    const [accounts, total] = await this.usersService.findAndCountAccounts(
      page,
      limit,
      role ? (role as UserRole) : undefined,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: accounts,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async banUser(id: string): Promise<{
    success: boolean;
    message: string;
    data: { userId: string; status: number };
  }> {
    const user = await this.usersService.findUserById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 0) {
      return {
        success: false,
        message: 'User is already banned',
        data: {
          userId: user.userId,
          status: user.status,
        },
      };
    }

    await this.usersService.updateUserStatus(id, 0);

    return {
      success: true,
      message: 'User has been successfully banned',
      data: {
        userId: id,
        status: 0,
      },
    };
  }

  async activateUser(id: string): Promise<{
    success: boolean;
    message: string;
    data: { userId: string; status: number };
  }> {
    const user = await this.usersService.findUserById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 1) {
      return {
        success: false,
        message: 'User is already active',
        data: {
          userId: user.userId,
          status: user.status,
        },
      };
    }

    await this.usersService.updateUserStatus(id, 1);

    return {
      success: true,
      message: 'User has been successfully activated',
      data: {
        userId: id,
        status: 1,
      },
    };
  }

  /**
   * Thống kê tổng quan toàn hệ thống
   */
  async getSystemStatistics() {
    const totalUsers = await this.usersService.countUsers();
    const totalCompetitors = await this.usersService.countUsers({
      role: UserRole.COMPETITOR,
    });
    const totalExaminers = await this.usersService.countUsers({
      role: UserRole.EXAMINER,
    });
    const totalGuardians = await this.usersService.countUsers({
      role: UserRole.GUARDIAN,
    });
    const totalStaffs = await this.usersService.countUsers({
      role: UserRole.STAFF,
    });
    const totalAdmins = await this.usersService.countUsers({
      role: UserRole.ADMIN,
    });

    const activeUsers = await this.usersService.countUsers({ status: 1 });
    const inactiveUsers = await this.usersService.countUsers({ status: 0 });

    const totalContests = await this.contestsQueryService.countContests();
    const activeContests = await this.contestsQueryService.countContests({
      status: ContestStatus.ACTIVE,
    });
    const upcomingContests = await this.contestsQueryService.countContests({
      status: ContestStatus.UPCOMING,
    });
    const endedContests = await this.contestsQueryService.countContests({
      status: ContestStatus.ENDED,
    });
    const draftContests = await this.contestsQueryService.countContests({
      status: ContestStatus.DRAFT,
    });

    const totalPaintings = await this.paintingsService.countPaintings();
    const approvedPaintings = await this.paintingsService.countPaintings({
      status: 'ACCEPTED',
    });
    const pendingPaintings = await this.paintingsService.countPaintings({
      status: 'PENDING',
    });
    const rejectedPaintings = await this.paintingsService.countPaintings({
      status: 'REJECTED',
    });

    const totalEvaluations = await this.paintingsService.countEvaluations();
    const totalVotes = await this.votesService.countVotes();
    const totalAwards = await this.awardsService.countAwards();

    const totalExhibitions = await this.exhibitionsService.countExhibitions();
    const activeExhibitions = await this.exhibitionsService.countExhibitions({
      status: 'ACTIVE',
    });
    const draftExhibitions = await this.exhibitionsService.countExhibitions({
      status: 'DRAFT',
    });

    const totalCampaigns = await this.campaignsService.countCampaigns();
    const activeCampaigns = await this.campaignsService.countCampaigns({
      status: CampaignStatus.ACTIVE,
    });
    const draftCampaigns = await this.campaignsService.countCampaigns({
      status: CampaignStatus.DRAFT,
    });

    const paintingsWithAwards =
      await this.paintingsService.findAwardedPaintingsWithAward();

    const schoolAwardCounts = new Map<string, number>();

    for (const painting of paintingsWithAwards) {
      if (!painting.competitorId) continue;

      const competitor = await this.competitorsService.findCompetitorById(
        painting.competitorId,
      );

      if (competitor?.schoolName) {
        const normalizedSchoolName = competitor.schoolName
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');

        const currentCount = schoolAwardCounts.get(normalizedSchoolName) || 0;
        schoolAwardCounts.set(normalizedSchoolName, currentCount + 1);
      }
    }

    const topSchools = Array.from(schoolAwardCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([schoolName, awardCount]) => ({ schoolName, awardCount }));

    // Tìm 3 contest gần nhất
    const recentContests =
      await this.contestsQueryService.listRecentContests(3);

    const recentContestIds = recentContests.map((c) => c.contestId);

    // Tìm học sinh đạt nhiều giải nhất trong 3 contest gần nhất
    const recentAwardedPaintings =
      await this.paintingsService.findByContestIds(recentContestIds);

    const competitorAwardCounts = new Map<
      string,
      {
        count: number;
        competitorId: string;
      }
    >();

    for (const painting of recentAwardedPaintings) {
      if (!painting.competitorId) continue;

      const current = competitorAwardCounts.get(painting.competitorId) || {
        count: 0,
        competitorId: painting.competitorId,
      };
      competitorAwardCounts.set(painting.competitorId, {
        ...current,
        count: current.count + 1,
      });
    }

    const topCompetitors = Array.from(competitorAwardCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCompetitorsWithDetails = await Promise.all(
      topCompetitors.map(async (item) => {
        const user = await this.usersService.findUserById(item.competitorId);

        const competitor = await this.competitorsService.findCompetitorById(
          item.competitorId,
        );

        return {
          competitorId: item.competitorId,
          competitorName: user?.fullName || 'Unknown',
          email: user?.email || null,
          schoolName: competitor?.schoolName || null,
          awardCount: item.count,
        };
      }),
    );

    return {
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          byRole: {
            competitors: totalCompetitors,
            examiners: totalExaminers,
            guardians: totalGuardians,
            staffs: totalStaffs,
            admins: totalAdmins,
          },
        },
        contests: {
          total: totalContests,
          active: activeContests,
          upcoming: upcomingContests,
          ended: endedContests,
          draft: draftContests,
        },
        paintings: {
          total: totalPaintings,
          accepted: approvedPaintings,
          pending: pendingPaintings,
          rejected: rejectedPaintings,
        },
        evaluations: {
          total: totalEvaluations,
        },
        votes: {
          total: totalVotes,
        },
        awards: {
          total: totalAwards,
        },
        exhibitions: {
          total: totalExhibitions,
          active: activeExhibitions,
          draft: draftExhibitions,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          draft: draftCampaigns,
        },
        topSchools: topSchools,
        topCompetitorsInRecentContests: {
          contests: recentContests.map((c) => ({
            contestId: c.contestId,
            title: c.title,
          })),
          competitors: topCompetitorsWithDetails,
        },
      },
    };
  }

  /**
   * Thống kê chi tiết theo cuộc thi
   */
  async getContestStatistics(contestId: number) {
    const contest = await this.contestsQueryService.findContestById(contestId);

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const totalSubmissions = await this.paintingsService.countPaintings({
      contestId,
    });
    const acceptedSubmissions = await this.paintingsService.countPaintings({
      contestId,
      status: 'ACCEPTED',
    });
    const pendingSubmissions = await this.paintingsService.countPaintings({
      contestId,
      status: 'PENDING',
    });
    const rejectedSubmissions = await this.paintingsService.countPaintings({
      contestId,
      status: 'REJECTED',
    });

    // Số lượng bài theo vòng thi
    const paintings = await this.paintingsService.findPaintings({ contestId });

    // Lấy round IDs từ bảng rounds dựa trên name
    const round1 = await this.contestsQueryService.findRoundByContestAndName(
      contestId,
      'ROUND_1',
    );

    // ROUND_2 có thể có nhiều tables (A, B, C, ...) dựa vào numberOfTablesRound2
    const round2Rounds =
      await this.contestsQueryService.findRoundsByContestAndName(
        contestId,
        'ROUND_2',
      );

    const round1Submissions = round1
      ? paintings.filter((p) => p.roundId === round1.roundId).length
      : 0;

    // Đếm tất cả submissions trong ROUND_2 (tất cả các tables)
    const round2RoundIds = round2Rounds.map((r) => r.roundId);
    const round2Submissions = paintings.filter((p) =>
      round2RoundIds.includes(p.roundId),
    ).length;

    // Chi tiết submissions theo từng table trong ROUND_2
    const round2ByTable: Record<string, number> = {};
    round2Rounds.forEach((round) => {
      const tableSubmissions = paintings.filter(
        (p) => p.roundId === round.roundId,
      ).length;
      round2ByTable[round.table || 'Unknown'] = tableSubmissions;
    });

    // Số lượng competitors tham gia
    const uniqueCompetitors = [
      ...new Set(paintings.map((p) => p.competitorId).filter(Boolean)),
    ].length;

    // Số lượng evaluations
    const paintingIds = paintings.map((p) => p.paintingId);
    const totalEvaluations =
      await this.paintingsService.countEvaluationsByPaintingIds(paintingIds);

    // Số lượng votes
    const totalVotes = await this.votesService.countVotes({ contestId });

    // Số lượng giải thưởng
    const totalAwards = await this.awardsService.countAwards({ contestId });

    // Số lượng bài đã được trao giải
    const awardedPaintings = paintings.filter((p) => p.awardId !== null).length;

    return {
      success: true,
      data: {
        contest: {
          contestId: contest.contestId,
          title: contest.title,
          status: contest.status,
          startDate: contest.startDate,
          endDate: contest.endDate,
        },
        submissions: {
          total: totalSubmissions,
          accepted: acceptedSubmissions,
          pending: pendingSubmissions,
          rejected: rejectedSubmissions,
          byRound: {
            round1: round1Submissions,
            round2: {
              total: round2Submissions,
              byTable: round2ByTable,
            },
          },
        },
        participants: {
          totalCompetitors: uniqueCompetitors,
        },
        evaluations: {
          total: totalEvaluations,
        },
        votes: {
          total: totalVotes,
        },
        awards: {
          total: totalAwards,
          awarded: awardedPaintings,
        },
      },
    };
  }

  /**
   * Thống kê top competitors (theo số bài thi và giải thưởng)
   */
  async getTopCompetitors(limit: number = 10) {
    const paintings = await this.paintingsService.findAcceptedPaintings();

    // Group by competitor
    const competitorStats = new Map<string, any>();

    for (const painting of paintings) {
      if (!painting.competitorId) continue;

      if (!competitorStats.has(painting.competitorId)) {
        competitorStats.set(painting.competitorId, {
          competitorId: painting.competitorId,
          totalSubmissions: 0,
          awardsWon: 0,
          paintingIds: [],
        });
      }

      const stats = competitorStats.get(painting.competitorId);
      stats.totalSubmissions++;
      stats.paintingIds.push(painting.paintingId);
      if (painting.awardId) {
        stats.awardsWon++;
      }
    }

    // Convert to array and sort
    const sortedCompetitors = Array.from(competitorStats.values())
      .sort((a, b) => {
        // Ưu tiên awards trước, sau đó đến submissions
        if (b.awardsWon !== a.awardsWon) {
          return b.awardsWon - a.awardsWon;
        }
        return b.totalSubmissions - a.totalSubmissions;
      })
      .slice(0, limit);

    // Fetch competitor details
    const competitorIds = sortedCompetitors.map((c) => c.competitorId);
    const users = await this.usersService.findUsersByIds(competitorIds);
    const userMap = new Map(users.map((u) => [u.userId, u]));

    const result = sortedCompetitors.map((stat) => {
      const user = userMap.get(stat.competitorId);
      return {
        competitorId: stat.competitorId,
        fullName: user?.fullName || 'Unknown',
        email: user?.email || '',
        totalSubmissions: stat.totalSubmissions,
        awardsWon: stat.awardsWon,
      };
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Thống kê top examiners (theo số lượng bài đã chấm)
   */
  async getTopExaminers(limit: number = 10) {
    const evaluations = await this.paintingsService.findEvaluations();

    // Group by examiner
    const examinerStats = new Map<string, any>();

    for (const evaluation of evaluations) {
      if (!examinerStats.has(evaluation.examinerId)) {
        examinerStats.set(evaluation.examinerId, {
          examinerId: evaluation.examinerId,
          totalEvaluations: 0,
        });
      }
      examinerStats.get(evaluation.examinerId).totalEvaluations++;
    }

    // Convert to array and sort
    const sortedExaminers = Array.from(examinerStats.values())
      .sort((a, b) => b.totalEvaluations - a.totalEvaluations)
      .slice(0, limit);

    // Fetch examiner details
    const examinerIds = sortedExaminers.map((e) => e.examinerId);
    const users = await this.usersService.findUsersByIds(examinerIds);
    const userMap = new Map(users.map((u) => [u.userId, u]));

    const result = sortedExaminers.map((stat) => {
      const user = userMap.get(stat.examinerId);
      return {
        examinerId: stat.examinerId,
        fullName: user?.fullName || 'Unknown',
        email: user?.email || '',
        totalEvaluations: stat.totalEvaluations,
      };
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Thống kê paintings có nhiều votes nhất
   */
  async getMostVotedPaintings(limit: number = 10) {
    const votes = await this.votesService.findVotes();

    // Group by painting
    const paintingVotes = new Map<string, number>();
    for (const vote of votes) {
      const count = paintingVotes.get(vote.paintingId) || 0;
      paintingVotes.set(vote.paintingId, count + 1);
    }

    // Sort and get top paintings
    const topPaintings = Array.from(paintingVotes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Fetch painting details
    const paintingIds = topPaintings.map(([id]) => id);
    const paintings =
      await this.paintingsService.findPaintingsByIds(paintingIds);
    const paintingMap = new Map(paintings.map((p) => [p.paintingId, p]));

    // Fetch competitor details
    const competitorIds = paintings.map((p) => p.competitorId).filter(Boolean);
    const users = await this.usersService.findUsersByIds(competitorIds);
    const userMap = new Map(users.map((u) => [u.userId, u]));

    const result = topPaintings.map(([paintingId, voteCount]) => {
      const painting = paintingMap.get(paintingId);
      const competitor = painting?.competitorId
        ? userMap.get(painting.competitorId)
        : null;

      return {
        paintingId,
        title: painting?.title || 'Unknown',
        competitorName: competitor?.fullName || 'Unknown',
        voteCount,
        contestId: painting?.contestId,
      };
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Thống kê tăng trưởng user theo thời gian
   */
  async getUserGrowthStatistics(
    startDate?: string,
    endDate?: string,
    groupBy: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    let whereCondition: any = {};

    // Apply date filters
    if (startDate && endDate) {
      whereCondition.createdAt = Between(
        new Date(startDate),
        new Date(endDate),
      );
    } else if (startDate) {
      whereCondition.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      whereCondition.createdAt = LessThanOrEqual(new Date(endDate));
    }

    // Fetch all users within date range
    const users = await this.usersService.findUsersByCreatedAt(whereCondition);

    // Group users by time period
    const groupedData = new Map<string, any>();

    users.forEach((user) => {
      const date = new Date(user.createdAt);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          // Get week number
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear =
            (date.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNumber = Math.ceil(
            (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7,
          );
          key = `${date.getFullYear()}-W${weekNumber}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
        case 'year':
          key = String(date.getFullYear()); // YYYY
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          totalUsers: 0,
          competitors: 0,
          examiners: 0,
          guardians: 0,
          staffs: 0,
          admins: 0,
        });
      }

      const group = groupedData.get(key);
      group.totalUsers++;

      // Count by role
      switch (user.role) {
        case UserRole.COMPETITOR:
          group.competitors++;
          break;
        case UserRole.EXAMINER:
          group.examiners++;
          break;
        case UserRole.GUARDIAN:
          group.guardians++;
          break;
        case UserRole.STAFF:
          group.staffs++;
          break;
        case UserRole.ADMIN:
          group.admins++;
          break;
      }
    });

    // Convert to array and add cumulative totals
    const sortedPeriods = Array.from(groupedData.keys()).sort();
    let cumulativeTotal = 0;

    const result = sortedPeriods.map((period) => {
      const data = groupedData.get(period);
      cumulativeTotal += data.totalUsers;
      return {
        ...data,
        cumulativeTotal,
      };
    });

    // Get total user count at the end of period
    const totalUsersInRange = users.length;
    const totalUsersCurrent = await this.usersService.countUsers();

    return {
      success: true,
      data: {
        summary: {
          totalUsersInRange,
          totalUsersCurrent,
          startDate: startDate || 'Beginning',
          endDate: endDate || 'Now',
          groupBy,
        },
        growth: result,
      },
    };
  }
}
