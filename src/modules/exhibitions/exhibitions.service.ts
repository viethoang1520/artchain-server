import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionPainting } from './entities/exhibition-painting.entity';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { UpdateExhibitionDto } from './dto/update-exhibition.dto';
import { AddPaintingsToExhibitionDto } from './dto/add-paintings.dto';
import { UpdatePaintingDto } from './dto/update-paintings.dto';
import { PaintingsService } from '../paintings/paintings.service';
import { CompetitorsService } from '../competitors/competitor.service';
import { AwardsService } from '../awards/awards.service';

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectRepository(Exhibition)
    private exhibitionRepository: Repository<Exhibition>,
    @InjectRepository(ExhibitionPainting)
    private exhibitionPaintingRepository: Repository<ExhibitionPainting>,
    private readonly paintingsService: PaintingsService,
    private readonly competitorsService: CompetitorsService,
    private readonly awardsService: AwardsService,
  ) { }

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
    const startDate = createExhibitionDto.startDate
      ? new Date(createExhibitionDto.startDate)
      : null;
    const endDate = createExhibitionDto.endDate
      ? new Date(createExhibitionDto.endDate)
      : null;

    if (
      (startDate && isNaN(startDate.getTime())) ||
      (endDate && isNaN(endDate.getTime()))
    ) {
      throw new BadRequestException('Ngày bắt đầu hoặc kết thúc không hợp lệ');
    }

    const exhibition = this.exhibitionRepository.create({
      name: sanitizedName,
      description: sanitizedDescription,
      startDate,
      endDate,
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
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '22021'
      ) {
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
          const { competitor, user } =
            await this.competitorsService.getCompetitorWithUser(
              painting.competitorId,
            );

          if (competitor && user) {
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

        // Get award info
        let awardInfo: any = null;
        if (painting.awardId) {
          const award = await this.awardsService.findById(painting.awardId);

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

    const payload: Partial<Exhibition> = {};

    if (Object.prototype.hasOwnProperty.call(updateExhibitionDto, 'name')) {
      payload.name = updateExhibitionDto.name;
    }

    if (
      Object.prototype.hasOwnProperty.call(updateExhibitionDto, 'description')
    ) {
      payload.description = updateExhibitionDto.description;
    }

    if (Object.prototype.hasOwnProperty.call(updateExhibitionDto, 'status')) {
      payload.status = updateExhibitionDto.status;
    }

    if (Object.prototype.hasOwnProperty.call(updateExhibitionDto, 'startDate')) {
      payload.startDate = updateExhibitionDto.startDate
        ? new Date(updateExhibitionDto.startDate)
        : null;

      if (payload.startDate && isNaN(payload.startDate.getTime())) {
        throw new BadRequestException('Ngày bắt đầu không hợp lệ');
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateExhibitionDto, 'endDate')) {
      payload.endDate = updateExhibitionDto.endDate
        ? new Date(updateExhibitionDto.endDate)
        : null;

      if (payload.endDate && isNaN(payload.endDate.getTime())) {
        throw new BadRequestException('Ngày kết thúc không hợp lệ');
      }
    }

    const updatedExhibition = this.exhibitionRepository.merge(exhibition, payload);

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
    const paintings = await this.paintingsService.findPaintingsByIds(
      addPaintingsDto.paintingIds,
    );

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
    const paintings = await this.paintingsService.findPaintingsByIds(
      updatePaintingDto.data.map((item) => item.paintingId),
    );

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
