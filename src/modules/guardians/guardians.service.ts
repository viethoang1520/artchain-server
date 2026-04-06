import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Competitor } from '../competitors/entities/competitors.entity';
import { User } from '../users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { RegisterDTO } from '../auth/dto/register.dto';

@Injectable()
export class GuardiansService {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @InjectRepository(Competitor)
    private readonly competitorRepository: Repository<Competitor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }
  async assignStudentToGuardian(
    studentData: Array<RegisterDTO>,
    guardianId: string,
  ) {
    const failedStudents: Array<{ student: string; reason: string }> = [];
    let successCount = 0;

    for (const student of studentData) {
      try {
        const createdStudent = await this.authService.register(student);

        await this.competitorRepository.update(
          { competitorId: createdStudent.userId },
          { guardianId: guardianId },
        );

        successCount += 1;
      } catch (error) {
        failedStudents.push({
          student: student.username || student.email || 'unknown',
          reason:
            error instanceof Error
              ? error.message
              : 'Unknown error while creating student',
        });
      }
    }

    const failureCount = failedStudents.length;
    return {
      success: failureCount === 0,
      message:
        failureCount === 0
          ? 'Tất cả học sinh đã được đăng ký và gán thành công.'
          : `Đã thêm ${successCount}/${studentData.length} học sinh. ${failureCount} học sinh đã thêm thất bại.`,
      summary: {
        total: studentData.length,
        successCount,
        failureCount,
      },
      failedStudents,
    };
  }

  async getStudentsByGuardian(guardianId: string) {
    // Get competitors assigned to this guardian
    const competitors = await this.competitorRepository.find({
      where: { guardianId: guardianId },
    });

    if (competitors.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Extract competitor IDs (which are the same as user IDs)
    const competitorIds = competitors.map(
      (competitor) => competitor.competitorId,
    );

    // Get corresponding user information
    const users = await this.userRepository.find({
      where: { userId: In(competitorIds) },
      select: {
        userId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    // Create a map of users by userId for easy lookup
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user.userId, user);
    });

    // Combine competitor and user data
    const combinedData = competitors.map((competitor) => {
      const user = userMap.get(competitor.competitorId);
      return {
        // User data
        userId: user?.userId,
        username: user?.username,
        fullName: user?.fullName,
        email: user?.email,
        phone: user?.phone,
        status: user?.status,
        createdAt: user?.createdAt,
        // Competitor data
        birthday: competitor.birthday,
        schoolName: competitor.schoolName,
        ward: competitor.ward,
        grade: competitor.grade,
        guardianId: competitor.guardianId,
      };
    });

    return {
      success: true,
      data: combinedData,
    };
  }

  /**
   * Lấy danh sách submissions của competitor
   */
  async getCompetitorSubmissions(competitorId: string) {
    return this.usersService.submissions(competitorId);
  }
}
