import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Repository } from 'typeorm';
import { RegisterDTO } from '../auth/dto/register.dto';

@Injectable()
export class GuardiansService {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Competitor)
    private readonly competitorRepository: Repository<Competitor> ,
  ) {}
  assignStudentToGuardian(studentData: Array<RegisterDTO>, guardianId: string) {
    studentData.forEach(async (student) => {
      const createdStudent = await this.authService.register(student);
      await this.competitorRepository.update(
        { competitorId: createdStudent.userId },
        { guardianId: guardianId },
      );
    });
    return {
      success: true,
      message: 'Students assigned to guardian successfully'
    };
  }
}
