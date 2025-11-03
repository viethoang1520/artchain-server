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

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectRepository(Exhibition)
    private exhibitionRepository: Repository<Exhibition>,
    @InjectRepository(ExhibitionPainting)
    private exhibitionPaintingRepository: Repository<ExhibitionPainting>,
    @InjectRepository(Painting)
    private paintingRepository: Repository<Painting>,
  ) {}

  async create(createExhibitionDto: CreateExhibitionDto) {
    const exhibition = this.exhibitionRepository.create({
      ...createExhibitionDto,
      numberOfPaintings: 0,
      status: createExhibitionDto.status || 'DRAFT',
    });

    const savedExhibition = await this.exhibitionRepository.save(exhibition);

    return {
      success: true,
      message: 'Exhibition created successfully',
      data: savedExhibition,
    };
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

    return {
      success: true,
      message: 'Exhibition retrieved successfully',
      data: exhibition,
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
    }));

    return {
      success: true,
      message: 'Exhibition paintings retrieved successfully',
      data: paintings,
      count: paintings.length,
    };
  }
}
