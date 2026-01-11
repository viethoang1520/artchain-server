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
        message: 'Exhibition created successfully',
        data: savedExhibition,
      };
    } catch (error) {
      if (error.code === '22021') {
        throw new BadRequestException(
          'Invalid characters detected in input. Please remove special characters or emojis.',
        );
      }
      throw error;
    }
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
      throw new NotFoundException(`Exhibition with ID ${id} not found`);
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

        painting.position = ep.position ? JSON.parse(ep.position) : null;
        painting.rotation = ep.rotation ? JSON.parse(ep.rotation) : null;
        painting.scale = ep.scale ? JSON.parse(ep.scale) : null;

        return {
          ...painting,
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
      throw new NotFoundException(`Exhibition with ID ${id} not found`);
    }

    const updatedExhibition = this.exhibitionRepository.merge(
      exhibition,
      updateExhibitionDto,
    );

    const savedExhibition =
      await this.exhibitionRepository.save(updatedExhibition);

    return {
      success: true,
      message: 'Exhibition updated successfully',
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
      message: 'Exhibition deleted successfully',
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
        `Exhibition with ID ${exhibitionId} not found`,
      );
    }

    // Validate all paintings exist
    const paintings = await this.paintingRepository.find({
      where: { paintingId: In(addPaintingsDto.paintingIds) },
    });

    if (paintings.length !== addPaintingsDto.paintingIds.length) {
      throw new BadRequestException('Some paintings do not exist');
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
        `Some paintings are already in this exhibition: ${duplicateIds.join(', ')}`,
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
        `Painting ${paintingId} not found in exhibition ${exhibitionId}`,
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
      message: 'Painting removed from exhibition successfully',
    };
  }

  async getPaintingsByExhibition(exhibitionId: number) {
    const exhibition = await this.exhibitionRepository.findOne({
      where: { exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(
        `Exhibition with ID ${exhibitionId} not found`,
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
      message: 'Exhibition paintings retrieved successfully',
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
        `Exhibition with ID ${exhibitionId} not found`,
      );
    }

    if (updatePaintingDto.data.length === 0) {
      await this.exhibitionPaintingRepository.update(
        { exhibitionId },
        { position: null, rotation: null, scale: null },
      );
      return {
        success: true,
        message: 'No paintings to update',
      };
    }

    // Validate all paintings exist
    const paintings = await this.paintingRepository.find({
      where: {
        paintingId: In(updatePaintingDto.data.map((item) => item.paintingId)),
      },
    });

    if (paintings.length !== updatePaintingDto.data.length) {
      throw new BadRequestException('Some paintings do not exist');
    }

    const results = await Promise.allSettled(
      updatePaintingDto.data.map(async (item) => {
        const exhibitionPainting =
          await this.exhibitionPaintingRepository.findOne({
            where: { exhibitionId, paintingId: item.paintingId },
          });

        if (!exhibitionPainting) {
          throw new NotFoundException(
            `Painting ${item.paintingId} not found in exhibition ${exhibitionId}`,
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
