import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionPainting } from './entities/exhibition-painting.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { UpdateExhibitionDto } from './dto/update-exhibition.dto';
import { AddPaintingsToExhibitionDto } from './dto/add-paintings.dto';
import { User } from '../users/entities/user.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Award } from '../awards/entities/award.entity';
import { UpdatePaintingDto } from './dto/update-paintings.dto';

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectRepository(Exhibition)
    private exhibitionRepository: Repository<Exhibition>,
    @InjectRepository(ExhibitionPainting)
    private exhibitionPaintingRepository: Repository<ExhibitionPainting>,
    @InjectRepository(Painting)
    private paintingRepository: Repository<Painting>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Competitor)
    private competitorRepository: Repository<Competitor>,
    @InjectRepository(Award)
    private awardRepository: Repository<Award>,
  ) {}

  /**
   * Sanitize string to remove invalid UTF-8 characters
   */
  private sanitizeString(str: string | null | undefined): string | null {
    if (!str) return null;

    // Remove invalid UTF-8 sequences and emoji characters that PostgreSQL might reject
    // This regex removes characters outside the Basic Multilingual Plane (BMP)
    return str.replace(/[\uD800-\uDFFF]/g, '').trim();
  }

  async create(createExhibitionDto: CreateExhibitionDto) {
    const sanitizedName =
      this.sanitizeString(createExhibitionDto.name) || createExhibitionDto.name;
    const sanitizedDescription =
      this.sanitizeString(createExhibitionDto.description) || undefined;

    const exhibition = this.exhibitionRepository.create({
      name: sanitizedName,
      description: sanitizedDescription,
      startDate: createExhibitionDto.startDate,
      endDate: createExhibitionDto.endDate,
      numberOfPaintings: 0,
      status: createExhibitionDto.status || 'DRAFT',
    });

    try {
      const savedExhibition = await this.exhibitionRepository.save(exhibition);

      return {
        success: true,
        message: 'Triển lãm được tạo thành công',
        data: savedExhibition,
      };
    } catch (error) {
      if (error.code === '22021') {
        throw new BadRequestException(
          'Đã phát hiện ký tự không hợp lệ trong đầu vào. Vui lòng loại bỏ các ký tự đặc biệt hoặc biểu tượng cảm xúc.',
        );
      }
      throw error;
    }
  }

  async countExhibitions(where?: any) {
    if (!where) {
      return this.exhibitionRepository.count();
    }

    return this.exhibitionRepository.count({ where });
  }

  async findAll(status?: string) {
    const whereCondition: any = {};

    if (status) {
      whereCondition.status = status;
    }

    const exhibitions = await this.exhibitionRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Exhibitions retrieved successfully',
      data: exhibitions,
      count: exhibitions.length,
    };
  }

  async findOne(id: number) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId: id },
      relations: ['exhibitionPaintings', 'exhibitionPaintings.painting'],
    });

    if (!exhibition) {
      throw new NotFoundException(`Triển lãm với ID ${id} không tìm thấy`);
    }

    // Enrich painting data with competitor and award information
    const enrichedPaintings = await Promise.all(
      exhibition.exhibitionPaintings.map(async (ep) => {
        const painting = ep.painting;

        // Get competitor info
        let competitorInfo: any = null;
        if (painting.competitorId) {
          const competitor = await this.competitorRepository.findOne({
            where: { competitorId: painting.competitorId },
          });

          if (competitor) {
            const user = await this.userRepository.findOne({
              where: { userId: competitor.competitorId },
            });

            if (user) {
              competitorInfo = {
                competitorId: competitor.competitorId,
                fullName: user.fullName,
                email: user.email,
                birthday: competitor.birthday,
                schoolName: competitor.schoolName,
                grade: competitor.grade,
              };
            }
          }
        }

        // Get award info
        let awardInfo: any = null;
        if (painting.awardId) {
          const award = await this.awardRepository.findOne({
            where: { awardId: painting.awardId },
          });

          if (award) {
            awardInfo = {
              awardId: award.awardId,
              name: award.name,
              description: award.description,
              rank: award.rank,
              prize: award.prize,
            };
          }
        }

        return {
          ...painting,
          position: ep.position ? JSON.parse(ep.position) : null,
          rotation: ep.rotation ? JSON.parse(ep.rotation) : null,
          scale: ep.scale ? JSON.parse(ep.scale) : null,
          competitor: competitorInfo,
          award: awardInfo,
          addedAt: ep.createdAt,
        };
      }),
    );

    return {
      success: true,
      message: 'Exhibition retrieved successfully',
      data: {
        ...exhibition,
        exhibitionPaintings: enrichedPaintings,
      },
    };
  }

  async update(id: number, updateExhibitionDto: UpdateExhibitionDto) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId: id },
    });

    if (!exhibition) {
      throw new NotFoundException(`Triển lãm với ID ${id} không tìm thấy`);
    }

    const updatedExhibition = this.exhibitionRepository.merge(
      exhibition,
      updateExhibitionDto,
    );

    const savedExhibition =
      await this.exhibitionRepository.save(updatedExhibition);

    return {
      success: true,
      message: 'Triển lãm được cập nhật thành công',
      data: savedExhibition,
    };
  }

  async remove(id: number) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId: id },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition with ID ${id} not found`);
    }

    // Delete all exhibition paintings first
    await this.exhibitionPaintingRepository.delete({ exhibitionId: id });

    // Delete exhibition
    await this.exhibitionRepository.delete(id);

    return {
      success: true,
      message: 'Triển lãm đã được xóa thành công',
    };
  }

  async addPaintings(
    exhibitionId: number,
    addPaintingsDto: AddPaintingsToExhibitionDto,
  ) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(
        `Triển lãm với ID ${exhibitionId} không tìm thấy`,
      );
    }

    // Validate all paintings exist
    const paintings = await this.paintingRepository.find({
      where: { paintingId: In(addPaintingsDto.paintingIds) },
    });

    if (paintings.length !== addPaintingsDto.paintingIds.length) {
      throw new BadRequestException('Một số tác phẩm không tồn tại');
    }

    // Check for duplicates
    const existingPaintings = await this.exhibitionPaintingRepository.find({
      where: {
        exhibitionId,
        paintingId: In(addPaintingsDto.paintingIds),
      },
    });

    if (existingPaintings.length > 0) {
      const duplicateIds = existingPaintings.map((ep) => ep.paintingId);
      throw new BadRequestException(
        `Một số tác phẩm đã có trong triển lãm này: ${duplicateIds.join(', ')}`,
      );
    }

    // Add paintings to exhibition
    const exhibitionPaintings = addPaintingsDto.paintingIds.map(
      (paintingId) => {
        return this.exhibitionPaintingRepository.create({
          exhibitionId,
          paintingId,
        });
      },
    );

    await this.exhibitionPaintingRepository.save(exhibitionPaintings);

    // Update number of paintings
    exhibition.numberOfPaintings += addPaintingsDto.paintingIds.length;
    await this.exhibitionRepository.save(exhibition);

    return {
      success: true,
      message: `Added ${addPaintingsDto.paintingIds.length} paintings to exhibition`,
      data: {
        exhibitionId,
        addedCount: addPaintingsDto.paintingIds.length,
        totalPaintings: exhibition.numberOfPaintings,
      },
    };
  }

  async removePainting(exhibitionId: number, paintingId: string) {
    const exhibitionPainting = await this.exhibitionPaintingRepository.findOne({
      where: { exhibitionId, paintingId },
    });

    if (!exhibitionPainting) {
      throw new NotFoundException(
        `Tác phẩm ${paintingId} không tìm thấy trong triển lãm ${exhibitionId}`,
      );
    }

    await this.exhibitionPaintingRepository.delete(exhibitionPainting.id);

    // Update number of paintings
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId },
    });

    if (exhibition) {
      exhibition.numberOfPaintings = Math.max(
        0,
        exhibition.numberOfPaintings - 1,
      );
      await this.exhibitionRepository.save(exhibition);
    }

    return {
      success: true,
      message: 'Tác phẩm đã được xóa khỏi triển lãm thành công',
    };
  }

  async getPaintingsByExhibition(exhibitionId: number) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(
        `Triển lãm với ID ${exhibitionId} không tìm thấy`,
      );
    }

    const exhibitionPaintings = await this.exhibitionPaintingRepository.find({
      where: { exhibitionId },
      relations: ['painting', 'painting.award'],
    });

    const paintings = exhibitionPaintings.map((ep) => ({
      ...ep.painting,
      addedAt: ep.createdAt,
      position: ep.position ? JSON.parse(ep.position) : null,
      rotation: ep.rotation ? JSON.parse(ep.rotation) : null,
      scale: ep.scale ? JSON.parse(ep.scale) : null,
    }));

    return {
      success: true,
      message: 'Tác phẩm trong triển lãm được lấy thành công',
      data: paintings,
      count: paintings.length,
    };
  }

  async updatePaintings(
    exhibitionId: number,
    updatePaintingDto: UpdatePaintingDto,
  ) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(
        `Triển lãm với ID ${exhibitionId} không tìm thấy`,
      );
    }

    if (updatePaintingDto.data.length === 0) {
      await this.exhibitionPaintingRepository.update(
        { exhibitionId },
        { position: null, rotation: null, scale: null },
      );
      return {
        success: true,
        message: 'Không có tác phẩm nào để cập nhật',
      };
    }

    // Validate all paintings exist
    const paintings = await this.paintingRepository.find({
      where: {
        paintingId: In(updatePaintingDto.data.map((item) => item.paintingId)),
      },
    });

    if (paintings.length !== updatePaintingDto.data.length) {
      throw new BadRequestException('Một số tác phẩm không tồn tại');
    }

    const results = await Promise.allSettled(
      updatePaintingDto.data.map(async (item) => {
        const exhibitionPainting =
          await this.exhibitionPaintingRepository.findOne({
            where: { exhibitionId, paintingId: item.paintingId },
          });

        if (!exhibitionPainting) {
          throw new NotFoundException(
            `Tác phẩm ${item.paintingId} không tìm thấy trong triển lãm ${exhibitionId}`,
          );
        }

        exhibitionPainting.position = item.position
          ? JSON.stringify(item.position)
          : item.position;
        exhibitionPainting.rotation = item.rotation
          ? JSON.stringify(item.rotation)
          : item.rotation;
        exhibitionPainting.scale = item.scale
          ? JSON.stringify(item.scale)
          : item.scale;
        return await this.exhibitionPaintingRepository.save(exhibitionPainting);
      }),
    );

    return results;
  }
}
