import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { PaginationDto, PaginatedResponse } from './dto/pagination.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Contest, ContestStatus } from '../contests/entities/contests.entity';
import { Round } from '../contests/entities/round.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';
import { Vote } from '../votes/entities/vote.entity';
import { Award } from '../awards/entities/award.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Exhibition } from '../exhibitions/entities/exhibition.entity';
import {
  Campaign,
  CampaignStatus,
} from '../campaigns/entities/campaign.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
    @InjectRepository(Painting)
    private paintingsRepository: Repository<Painting>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Vote)
    private votesRepository: Repository<Vote>,
    @InjectRepository(Award)
    private awardsRepository: Repository<Award>,
    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,
    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,
    @InjectRepository(Exhibition)
    private exhibitionsRepository: Repository<Exhibition>,
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
  ) {}

  async findAllCompetitors(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [competitors, total] = await this.usersRepository.findAndCount({
      where: { role: UserRole.COMPETITOR },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: {
        userId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        positionLevel: true,
      },
    });

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
    const skip = (page - 1) * limit;

    // Build where condition
    const whereCondition: any = {};
    if (role) {
      whereCondition.role = role as UserRole;
    }

    const [accounts, total] = await this.usersRepository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: {
        userId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        positionLevel: true,
      },
    });

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
    const user = await this.usersRepository.findOne({
      where: { userId: id },
    });

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

    await this.usersRepository.update(id, { status: 0 });

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
    const user = await this.usersRepository.findOne({
      where: { userId: id },
    });

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

    await this.usersRepository.update(id, { status: 1 });

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
    // Tổng số users theo từng role
    const totalUsers = await this.usersRepository.count();
    const totalCompetitors = await this.usersRepository.count({
      where: { role: UserRole.COMPETITOR },
    });
    const totalExaminers = await this.usersRepository.count({
      where: { role: UserRole.EXAMINER },
    });
    const totalGuardians = await this.usersRepository.count({
      where: { role: UserRole.GUARDIAN },
    });
    const totalStaffs = await this.usersRepository.count({
      where: { role: UserRole.STAFF },
    });
    const totalAdmins = await this.usersRepository.count({
      where: { role: UserRole.ADMIN },
    });

    // Active users
    const activeUsers = await this.usersRepository.count({
      where: { status: 1 },
    });
    const inactiveUsers = await this.usersRepository.count({
      where: { status: 0 },
    });

    // Tổng số cuộc thi
    const totalContests = await this.contestsRepository.count();
    const activeContests = await this.contestsRepository.count({
      where: { status: ContestStatus.ACTIVE },
    });
    const upcomingContests = await this.contestsRepository.count({
      where: { status: ContestStatus.UPCOMING },
    });
    const endedContests = await this.contestsRepository.count({
      where: { status: ContestStatus.ENDED },
    });
    const completedContests = await this.contestsRepository.count({
      where: { status: ContestStatus.COMPLETED },
    });
    const draftContests = await this.contestsRepository.count({
      where: { status: ContestStatus.DRAFT },
    });

    // Tổng số bài dự thi
    const totalPaintings = await this.paintingsRepository.count();
    const approvedPaintings = await this.paintingsRepository.count({
      where: { status: 'ACCEPTED' },
    });
    const pendingPaintings = await this.paintingsRepository.count({
      where: { status: 'PENDING' },
    });
    const rejectedPaintings = await this.paintingsRepository.count({
      where: { status: 'REJECTED' },
    });

    // Tổng số đánh giá
    const totalEvaluations = await this.evaluationsRepository.count();

    // Tổng số vote
    const totalVotes = await this.votesRepository.count();

    // Tổng số giải thưởng
    const totalAwards = await this.awardsRepository.count();

    // Tổng số triển lãm
    const totalExhibitions = await this.exhibitionsRepository.count();
    const activeExhibitions = await this.exhibitionsRepository.count({
      where: { status: 'ACTIVE' },
    });
    const draftExhibitions = await this.exhibitionsRepository.count({
      where: { status: 'DRAFT' },
    });

    // Tổng số campaign
    const totalCampaigns = await this.campaignsRepository.count();
    const activeCampaigns = await this.campaignsRepository.count({
      where: { status: CampaignStatus.ACTIVE },
    });
    const draftCampaigns = await this.campaignsRepository.count({
      where: { status: CampaignStatus.DRAFT },
    });

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
          completed: completedContests,
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
      },
    };
  }

  /**
   * Thống kê chi tiết theo cuộc thi
   */
  async getContestStatistics(contestId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const totalSubmissions = await this.paintingsRepository.count({
      where: { contestId },
    });
    const acceptedSubmissions = await this.paintingsRepository.count({
      where: { contestId, status: 'ACCEPTED' },
    });
    const pendingSubmissions = await this.paintingsRepository.count({
      where: { contestId, status: 'PENDING' },
    });
    const rejectedSubmissions = await this.paintingsRepository.count({
      where: { contestId, status: 'REJECTED' },
    });

    // Số lượng bài theo vòng thi
    const paintings = await this.paintingsRepository.find({
      where: { contestId },
    });

    // Lấy round IDs từ bảng rounds dựa trên name
    const round1 = await this.roundsRepository.findOne({
      where: { contestId, name: 'ROUND_1' },
    });

    // ROUND_2 có thể có nhiều tables (A, B, C, ...) dựa vào numberOfTablesRound2
    const round2Rounds = await this.roundsRepository.find({
      where: { contestId, name: 'ROUND_2' },
    });

    const round1Submissions = round1
      ? paintings.filter((p) => p.roundId === String(round1.roundId)).length
      : 0;

    // Đếm tất cả submissions trong ROUND_2 (tất cả các tables)
    const round2RoundIds = round2Rounds.map((r) => String(r.roundId));
    const round2Submissions = paintings.filter((p) =>
      round2RoundIds.includes(p.roundId),
    ).length;

    // Chi tiết submissions theo từng table trong ROUND_2
    const round2ByTable: Record<string, number> = {};
    round2Rounds.forEach((round) => {
      const tableSubmissions = paintings.filter(
        (p) => p.roundId === String(round.roundId),
      ).length;
      round2ByTable[round.table || 'Unknown'] = tableSubmissions;
    });

    // Số lượng competitors tham gia
    const uniqueCompetitors = [
      ...new Set(paintings.map((p) => p.competitorId).filter(Boolean)),
    ].length;

    // Số lượng evaluations
    const paintingIds = paintings.map((p) => p.paintingId);
    const totalEvaluations = await this.evaluationsRepository
      .createQueryBuilder('evaluation')
      .where('evaluation.painting_id IN (:...paintingIds)', { paintingIds })
      .getCount();

    // Số lượng votes
    const totalVotes = await this.votesRepository.count({
      where: { contestId },
    });

    // Số lượng giải thưởng
    const totalAwards = await this.awardsRepository.count({
      where: { contestId },
    });

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
    const paintings = await this.paintingsRepository.find({
      where: { status: 'ACCEPTED' },
    });

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
    const users = await this.usersRepository.findByIds(competitorIds);
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
    const evaluations = await this.evaluationsRepository.find();

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
    const users = await this.usersRepository.findByIds(examinerIds);
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
    const votes = await this.votesRepository.find();

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
    const paintings = await this.paintingsRepository.findByIds(paintingIds);
    const paintingMap = new Map(paintings.map((p) => [p.paintingId, p]));

    // Fetch competitor details
    const competitorIds = paintings.map((p) => p.competitorId).filter(Boolean);
    const users = await this.usersRepository.findByIds(competitorIds);
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
    const users = await this.usersRepository.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });

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
    const totalUsersCurrent = await this.usersRepository.count();

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
