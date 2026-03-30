import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  IsNull,
  Not,
  In,
  LessThanOrEqual,
  DataSource,
  EntityManager,
} from 'typeorm';
import {
  Auction,
  AuctionPainting,
  AuctionParticipant,
  BidHistory,
} from './entities';
import { AuctionStatus } from './entities/auction.entity';
import { AuctionPaintingStatus } from './entities/auction-painting.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import {
  CreateAuctionDto,
  PlaceBidDto,
  AddPaintingToAuctionDto,
  QueryAuctionDto,
  GetBidHistoryDto,
  BidHistoryStatus,
  UpdateAuctionStatusDto,
} from './dto';

@Injectable()
export class AuctionsService {
  private static readonly ANTI_SNIPING_WINDOW_MS = 10_000;
  private static readonly ANTI_SNIPING_EXTENSION_MS = 60_000;
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(AuctionPainting)
    private readonly auctionPaintingRepository: Repository<AuctionPainting>,
    @InjectRepository(AuctionParticipant)
    private readonly auctionParticipantRepository: Repository<AuctionParticipant>,
    @InjectRepository(BidHistory)
    private readonly bidHistoryRepository: Repository<BidHistory>,
    @InjectRepository(Painting)
    private readonly paintingRepository: Repository<Painting>,
    private readonly dataSource: DataSource,
  ) {}

  async createAuction(
    createAuctionDto: CreateAuctionDto,
    userId: string,
  ): Promise<Auction> {
    const { title, startTime, endTime, auctioneerId } = createAuctionDto;

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }

    const auction = this.auctionRepository.create({
      title,
      startTime: start,
      endTime: end,
      auctioneerId: auctioneerId || userId,
      status: AuctionStatus.DRAFT,
    });

    return await this.auctionRepository.save(auction);
  }

  async addPaintingToAuction(
    auctionId: number,
    addPaintingDto: AddPaintingToAuctionDto,
  ): Promise<AuctionPainting> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });
    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể thêm tranh vào phiên đấu giá ở trạng thái nháp',
      );
    }

    if (
      addPaintingDto.ceilPrice &&
      addPaintingDto.ceilPrice <= addPaintingDto.basePrice
    ) {
      throw new BadRequestException('Giá trần phải lớn hơn giá khởi điểm');
    }

    const existingPainting = await this.auctionPaintingRepository.findOne({
      where: {
        auctionId,
        paintingId: addPaintingDto.paintingId,
      },
    });
    if (existingPainting) {
      throw new BadRequestException('Tranh đã được thêm vào phiên đấu giá này');
    }

    const blockedPainting = await this.auctionPaintingRepository.findOne({
      where: [
        {
          paintingId: addPaintingDto.paintingId,
          isSold: true,
        },
        {
          paintingId: addPaintingDto.paintingId,
          auction: {
            status: In([
              AuctionStatus.DRAFT,
              AuctionStatus.UPCOMING,
              AuctionStatus.LIVE,
            ]),
          },
        },
      ],
      relations: ['auction'],
    });

    if (blockedPainting) {
      throw new BadRequestException(
        'Tranh đã/đang được đấu giá, không thể thêm vào phiên mới',
      );
    }

    const auctionPainting = this.auctionPaintingRepository.create({
      auctionId,
      paintingId: addPaintingDto.paintingId,
      basePrice: addPaintingDto.basePrice,
      ceilPrice: addPaintingDto.ceilPrice,
      bidStep: addPaintingDto.bidStep,
      auctionDurationMinutes: addPaintingDto.auctionDurationMinutes ?? null,
      auctionStartTime: null,
      auctionEndTime: null,
      status: AuctionPaintingStatus.WAITING,
      currentBid: addPaintingDto.basePrice,
      isSold: false,
      revoked: 0,
    });

    const saved = await this.auctionPaintingRepository.save(auctionPainting);

    await this.paintingRepository.update(
      { paintingId: addPaintingDto.paintingId },
      { status: 'IN_AUCTION' },
    );

    const paintingWithRelations = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId: saved.auctionPaintingId },
      relations: ['painting', 'auction'],
    });

    if (!paintingWithRelations) {
      throw new NotFoundException('Không thể tải thông tin tranh đấu giá');
    }

    return paintingWithRelations;
  }

  async joinAuction(
    auctionId: number,
    userId: string,
  ): Promise<AuctionParticipant> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });
    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    const existingParticipant = await this.auctionParticipantRepository.findOne(
      {
        where: { auctionId, userId },
        relations: ['user', 'auction'],
      },
    );
    if (existingParticipant) {
      return existingParticipant;
    }

    const participant = this.auctionParticipantRepository.create({
      auctionId,
      userId,
    });

    const savedParticipant =
      await this.auctionParticipantRepository.save(participant);

    const participantWithRelations =
      await this.auctionParticipantRepository.findOne({
        where: { participantId: savedParticipant.participantId },
        relations: ['user', 'auction'],
      });

    if (!participantWithRelations) {
      throw new NotFoundException('Không thể tải thông tin người tham gia');
    }

    return participantWithRelations;
  }

  async placeBid(
    placeBidDto: PlaceBidDto,
    userId: string,
  ): Promise<{
    bidHistory: BidHistory;
    auctionPainting: AuctionPainting;
    bidderFullName: string | null;
  }> {
    const { auctionPaintingId, bidAmount } = placeBidDto;
    return await this.dataSource.transaction(async (manager) => {
      const auctionPaintingRepo = manager.getRepository(AuctionPainting);
      const auctionRepo = manager.getRepository(Auction);
      const participantRepo = manager.getRepository(AuctionParticipant);
      const bidHistoryRepo = manager.getRepository(BidHistory);
      const paintingRepo = manager.getRepository(Painting);

      const auctionPainting = await auctionPaintingRepo.findOne({
        where: { auctionPaintingId },
      });

      if (!auctionPainting) {
        throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
      }

      const auction = await auctionRepo.findOne({
        where: { auctionId: auctionPainting.auctionId },
      });

      if (!auction) {
        throw new NotFoundException('Không tìm thấy phiên đấu giá');
      }

      const now = new Date();

      if (
        auction.status === AuctionStatus.UPCOMING &&
        now >= auction.startTime
      ) {
        auction.status = AuctionStatus.LIVE;
        await auctionRepo.save(auction);
      }

      if (auction.status !== AuctionStatus.LIVE) {
        throw new BadRequestException('Phiên đấu giá không đang diễn ra');
      }

      if (now < auction.startTime) {
        throw new BadRequestException('Phiên đấu giá chưa bắt đầu');
      }

      const activePainting = await this.ensureActivePaintingForAuction(
        manager,
        auction,
        now,
      );

      if (!activePainting) {
        throw new BadRequestException(
          'Phiên đấu giá không còn tranh để đấu giá',
        );
      }

      if (activePainting.auctionPaintingId !== auctionPaintingId) {
        throw new BadRequestException(
          `Hiện tại chỉ có thể đấu giá tranh #${activePainting.auctionPaintingId}`,
        );
      }

      let paintingEndTime =
        activePainting.auctionEndTime ||
        this.getInitialAuctionPaintingEndTime(
          auction,
          activePainting.auctionDurationMinutes,
          now,
        );

      if (!activePainting.auctionEndTime) {
        activePainting.auctionEndTime = paintingEndTime;
      }

      if (now >= paintingEndTime) {
        throw new BadRequestException('Đã quá thời gian đấu giá của bức tranh');
      }

      if (activePainting.isSold) {
        throw new BadRequestException('Tranh đã được bán');
      }

      if (activePainting.status !== AuctionPaintingStatus.LIVE) {
        throw new BadRequestException(
          'Tranh hiện tại không ở trạng thái đang đấu giá',
        );
      }

      const participant = await participantRepo.findOne({
        where: { auctionId: auction.auctionId, userId },
        relations: ['user'],
      });

      if (!participant) {
        throw new ForbiddenException(
          'Bạn phải tham gia phiên đấu giá trước khi đặt giá',
        );
      }

      const currentBid = activePainting.currentBid || activePainting.basePrice;
      const minBid = currentBid + activePainting.bidStep;

      if (bidAmount < minBid) {
        throw new BadRequestException(
          `Giá đặt phải ít nhất ${minBid.toLocaleString('vi-VN')} VNĐ`,
        );
      }

      if (activePainting.ceilPrice && bidAmount > activePainting.ceilPrice) {
        throw new BadRequestException(
          `Giá đặt không được vượt quá giá trần ${activePainting.ceilPrice.toLocaleString('vi-VN')} VNĐ`,
        );
      }

      await bidHistoryRepo.update(
        {
          auctionPaintingId: activePainting.auctionPaintingId,
          status: 'ACTIVE',
        },
        { status: 'OUTBID' },
      );

      const bidHistory = bidHistoryRepo.create({
        auctionPaintingId: activePainting.auctionPaintingId,
        bidderId: userId,
        bidAmount,
        status: 'ACTIVE',
      });
      await bidHistoryRepo.save(bidHistory);

      const hitCeilPrice =
        activePainting.ceilPrice !== null &&
        bidAmount === activePainting.ceilPrice;

      activePainting.currentBid = bidAmount;
      activePainting.currentBidderId = userId;

      const remainingMs = paintingEndTime.getTime() - now.getTime();
      if (
        !hitCeilPrice &&
        remainingMs <= AuctionsService.ANTI_SNIPING_WINDOW_MS
      ) {
        paintingEndTime = new Date(
          paintingEndTime.getTime() + AuctionsService.ANTI_SNIPING_EXTENSION_MS,
        );
        activePainting.auctionEndTime = paintingEndTime;
      }

      if (hitCeilPrice) {
        activePainting.isSold = true;
        activePainting.status = AuctionPaintingStatus.END;
        if (!activePainting.auctionStartTime) {
          activePainting.auctionStartTime = now;
        }
        activePainting.auctionEndTime = now;
      }

      await auctionPaintingRepo.save(activePainting);

      if (hitCeilPrice) {
        await paintingRepo.update(
          { paintingId: activePainting.paintingId },
          { ownerId: userId, status: 'SOLD' },
        );

        await this.ensureActivePaintingForAuction(manager, auction, now);
      }

      return {
        bidHistory,
        auctionPainting: activePainting,
        bidderFullName: participant.user?.fullName || null,
      };
    });
  }

  async placeBidByAuctionAndPainting(
    auctionId: number,
    paintingId: string,
    bidAmount: number,
    userId: string,
  ): Promise<{
    bidHistory: BidHistory;
    auctionPainting: AuctionPainting;
    bidderFullName: string | null;
  }> {
    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionId, paintingId },
    });

    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    return await this.placeBid(
      {
        auctionPaintingId: auctionPainting.auctionPaintingId,
        bidAmount,
      },
      userId,
    );
  }

  async getAuctions(queryDto: QueryAuctionDto) {
    const {
      status,
      startFrom,
      startTo,
      endFrom,
      endTo,
      page = 1,
      limit = 10,
    } = queryDto;

    const now = new Date();
    await this.auctionRepository.update(
      {
        status: AuctionStatus.UPCOMING,
        startTime: LessThanOrEqual(now),
      },
      { status: AuctionStatus.LIVE },
    );

    const queryBuilder = this.auctionRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.auctioneer', 'auctioneer')
      .leftJoinAndSelect('auction.auctionPaintings', 'auctionPaintings')
      .leftJoinAndSelect('auctionPaintings.painting', 'painting');

    if (status) {
      queryBuilder.andWhere('auction.status = :status', { status });
    }
    // else {
    //   queryBuilder.andWhere('auction.status != :draftStatus', {
    //     draftStatus: AuctionStatus.DRAFT,
    //   });
    // }

    if (startFrom) {
      queryBuilder.andWhere('auction.startTime >= :startFrom', {
        startFrom: new Date(startFrom),
      });
    }
    if (startTo) {
      queryBuilder.andWhere('auction.startTime <= :startTo', {
        startTo: new Date(startTo),
      });
    }

    if (endFrom) {
      queryBuilder.andWhere('auction.endTime >= :endFrom', {
        endFrom: new Date(endFrom),
      });
    }
    if (endTo) {
      queryBuilder.andWhere('auction.endTime <= :endTo', {
        endTo: new Date(endTo),
      });
    }

    queryBuilder
      .orderBy('auction.startTime', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [auctions, total] = await queryBuilder.getManyAndCount();

    return {
      data: auctions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuctionDetail(auctionId: number): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
      relations: [
        'auctioneer',
        'auctionPaintings',
        'auctionPaintings.painting',
        'auctionPaintings.currentBidder',
        'auctionParticipants',
        'auctionParticipants.user',
      ],
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    const now = new Date();
    if (
      auction.status === AuctionStatus.UPCOMING &&
      now >= auction.startTime &&
      now <= auction.endTime
    ) {
      auction.status = AuctionStatus.LIVE;
      await this.auctionRepository.save(auction);
    }

    return auction;
  }

  async getWonPaintingsByUserId(userId: string): Promise<
    {
      auctionPaintingId: number;
      auctionId: number;
      auctionTitle: string;
      auctionEndTime: Date | null;
      finalBid: number | null;
      painting: AuctionPainting['painting'];
    }[]
  > {
    const wonAuctionPaintings = await this.auctionPaintingRepository
      .createQueryBuilder('auctionPainting')
      .leftJoinAndSelect('auctionPainting.auction', 'auction')
      .leftJoinAndSelect('auctionPainting.painting', 'painting')
      .where('auctionPainting.currentBidderId = :userId', { userId })
      .andWhere('auction.status = :completedStatus', {
        completedStatus: AuctionStatus.END,
      })
      .orderBy('auction.endTime', 'DESC')
      .getMany();

    return wonAuctionPaintings.map((item) => ({
      auctionPaintingId: item.auctionPaintingId,
      auctionId: item.auctionId,
      auctionTitle: item.auction?.title,
      auctionEndTime: item.auctionEndTime,
      finalBid: item.currentBid,
      painting: item.painting,
    }));
  }

  private getInitialAuctionPaintingEndTime(
    auction: Auction,
    auctionDurationMinutes: number | null | undefined,
    referenceTime: Date = auction.startTime,
  ): Date {
    if (auctionDurationMinutes && auctionDurationMinutes > 0) {
      return new Date(
        referenceTime.getTime() + auctionDurationMinutes * 60 * 1000,
      );
    }

    return auction.endTime;
  }

  private async ensureActivePaintingForAuction(
    manager: EntityManager,
    auction: Auction,
    now: Date,
  ): Promise<AuctionPainting | null> {
    const auctionPaintingRepo = manager.getRepository(AuctionPainting);
    const paintingRepo = manager.getRepository(Painting);

    let currentLivePainting = await auctionPaintingRepo
      .createQueryBuilder('auctionPainting')
      .where('auctionPainting.auctionId = :auctionId', {
        auctionId: auction.auctionId,
      })
      .andWhere('auctionPainting.status = :liveStatus', {
        liveStatus: AuctionPaintingStatus.LIVE,
      })
      .orderBy('auctionPainting.createdAt', 'ASC')
      .addOrderBy('auctionPainting.auctionPaintingId', 'ASC')
      .setLock('pessimistic_write')
      .getOne();

    if (
      currentLivePainting &&
      currentLivePainting.auctionEndTime &&
      now >= currentLivePainting.auctionEndTime
    ) {
      currentLivePainting.status = AuctionPaintingStatus.END;

      if (currentLivePainting.currentBidderId) {
        currentLivePainting.isSold = true;
        await paintingRepo.update(
          { paintingId: currentLivePainting.paintingId },
          { ownerId: currentLivePainting.currentBidderId, status: 'SOLD' },
        );
      } else {
        await paintingRepo.update(
          { paintingId: currentLivePainting.paintingId },
          { status: 'RE_OPEN' },
        );
      }

      await auctionPaintingRepo.save(currentLivePainting);
      currentLivePainting = null;
    }

    if (currentLivePainting) {
      return currentLivePainting;
    }

    const nextWaitingPainting = await auctionPaintingRepo
      .createQueryBuilder('auctionPainting')
      .where('auctionPainting.auctionId = :auctionId', {
        auctionId: auction.auctionId,
      })
      .andWhere('auctionPainting.status = :waitingStatus', {
        waitingStatus: AuctionPaintingStatus.WAITING,
      })
      .orderBy('auctionPainting.createdAt', 'ASC')
      .addOrderBy('auctionPainting.auctionPaintingId', 'ASC')
      .setLock('pessimistic_write')
      .getOne();

    if (!nextWaitingPainting) {
      return null;
    }

    nextWaitingPainting.status = AuctionPaintingStatus.LIVE;
    nextWaitingPainting.auctionStartTime = now;
    nextWaitingPainting.auctionEndTime = this.getInitialAuctionPaintingEndTime(
      auction,
      nextWaitingPainting.auctionDurationMinutes,
      now,
    );

    return await auctionPaintingRepo.save(nextWaitingPainting);
  }

  async getBidHistory(
    auctionPaintingId: number,
    queryDto: GetBidHistoryDto,
  ): Promise<{
    data: BidHistory[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const { limit = 10, page = 1, status = BidHistoryStatus.ALL } = queryDto;
    const offset = (page - 1) * limit;

    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId },
      relations: ['painting', 'auction'],
    });

    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    const whereCondition: any = {
      auctionPaintingId,
    };

    if (status !== BidHistoryStatus.ALL) {
      whereCondition.status = status;
    }

    const [bidHistories, totalItems] =
      await this.bidHistoryRepository.findAndCount({
        where: whereCondition,
        relations: ['bidder'],
        order: { bidTime: 'DESC' },
        take: limit,
        skip: offset,
      });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: bidHistories,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async getBidHistoryByAuctionAndPainting(
    auctionId: number,
    paintingId: string,
    queryDto: GetBidHistoryDto,
  ): Promise<{
    data: BidHistory[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionId, paintingId },
    });

    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    return await this.getBidHistory(
      auctionPainting.auctionPaintingId,
      queryDto,
    );
  }

  async getAuctionBidHistory(
    auctionId: number,
    queryDto: GetBidHistoryDto,
  ): Promise<{
    data: {
      auctionPaintingId: number;
      painting: any;
      bidHistories: BidHistory[];
    }[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const { limit = 10, page = 1, status = BidHistoryStatus.ALL } = queryDto;
    const offset = (page - 1) * limit;

    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    const auctionPaintings = await this.auctionPaintingRepository.find({
      where: { auctionId },
      relations: ['painting'],
      order: { createdAt: 'ASC', auctionPaintingId: 'ASC' },
    });

    const result: {
      auctionPaintingId: number;
      painting: any;
      bidHistories: BidHistory[];
    }[] = [];
    let totalBidHistories = 0;

    for (const auctionPainting of auctionPaintings) {
      const whereCondition: any = {
        auctionPaintingId: auctionPainting.auctionPaintingId,
      };

      if (status !== BidHistoryStatus.ALL) {
        whereCondition.status = status;
      }

      const bidHistories = await this.bidHistoryRepository.find({
        where: whereCondition,
        relations: ['bidder'],
        order: { bidTime: 'DESC' },
      });

      totalBidHistories += bidHistories.length;

      if (bidHistories.length > 0) {
        result.push({
          auctionPaintingId: auctionPainting.auctionPaintingId,
          painting: auctionPainting.painting,
          bidHistories,
        });
      }
    }

    const totalPages = Math.ceil(totalBidHistories / limit);
    const paginatedResult = result.slice(offset, offset + limit);

    return {
      data: paginatedResult,
      pagination: {
        page,
        limit,
        totalItems: totalBidHistories,
        totalPages,
      },
    };
  }

  async updateAuctionStatus(
    auctionId: number,
    updateStatusDto: UpdateAuctionStatusDto,
    userId: string,
  ): Promise<Auction> {
    const { status } = updateStatusDto;

    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
      relations: ['auctioneer'],
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (auction.auctioneerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật trạng thái phiên đấu giá này',
      );
    }

    const validTransitions: Record<AuctionStatus, AuctionStatus[]> = {
      [AuctionStatus.DRAFT]: [AuctionStatus.UPCOMING],
      [AuctionStatus.UPCOMING]: [AuctionStatus.LIVE],
      [AuctionStatus.LIVE]: [AuctionStatus.END],
      [AuctionStatus.END]: [],
    };

    if (!validTransitions[auction.status].includes(status)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${auction.status} sang ${status}`,
      );
    }

    let liveStartedAt: Date | null = null;

    if (status === AuctionStatus.LIVE) {
      const now = new Date();
      if (now > auction.endTime) {
        throw new BadRequestException(
          'Không thể bắt đầu đấu giá sau thời gian kết thúc',
        );
      }

      auction.startTime = now;
      liveStartedAt = now;
    }

    auction.status = status;
    const updatedAuction = await this.auctionRepository.save(auction);

    if (status === AuctionStatus.LIVE) {
      const activePainting = await this.dataSource.transaction(
        async (manager) => {
          return await this.ensureActivePaintingForAuction(
            manager,
            updatedAuction,
            liveStartedAt || new Date(),
          );
        },
      );

      if (!activePainting) {
        throw new BadRequestException('Phiên đấu giá chưa có tranh để bắt đầu');
      }
    }

    const result = await this.auctionRepository.findOne({
      where: { auctionId },
      relations: [
        'auctioneer',
        'auctionPaintings',
        'auctionPaintings.painting',
        'auctionPaintings.currentBidder',
      ],
    });

    if (!result) {
      throw new NotFoundException('Không thể tải lại thông tin phiên đấu giá');
    }

    return result;
  }

  async endAuction(auctionId: number, userId: string): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
      relations: ['auctioneer'],
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (auction.auctioneerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền kết thúc phiên đấu giá này',
      );
    }

    if (auction.status !== AuctionStatus.LIVE) {
      throw new BadRequestException(
        'Chỉ có thể kết thúc phiên đấu giá đang diễn ra',
      );
    }

    const now = new Date();
    auction.status = AuctionStatus.END;
    auction.endTime = now;
    await this.auctionRepository.save(auction);

    const soldPaintings = await this.auctionPaintingRepository.find({
      where: {
        auctionId,
        currentBidderId: Not(IsNull()),
      },
    });

    if (soldPaintings.length > 0) {
      await this.auctionPaintingRepository.update(
        { auctionId, currentBidderId: Not(IsNull()) },
        { isSold: true, status: AuctionPaintingStatus.END },
      );

      await Promise.all(
        soldPaintings.map((item) =>
          this.paintingRepository.update(
            { paintingId: item.paintingId },
            { ownerId: item.currentBidderId, status: 'SOLD' },
          ),
        ),
      );
    }

    const unsoldPaintings = await this.auctionPaintingRepository.find({
      where: { auctionId, isSold: false },
    });

    if (unsoldPaintings.length > 0) {
      await this.auctionPaintingRepository.update(
        { auctionId, isSold: false },
        { status: AuctionPaintingStatus.END },
      );

      await this.paintingRepository.update(
        {
          paintingId: In(unsoldPaintings.map((item) => item.paintingId)),
        },
        { status: 'RE_OPEN' },
      );
    }

    const result = await this.auctionRepository.findOne({
      where: { auctionId },
      relations: [
        'auctioneer',
        'auctionPaintings',
        'auctionPaintings.painting',
        'auctionPaintings.currentBidder',
      ],
    });

    if (!result) {
      throw new NotFoundException('Không thể tải lại thông tin phiên đấu giá');
    }

    return result;
  }

  @Cron('*/2 * * * * *', {
    name: 'rotate-auction-paintings',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleAuctionPaintingRotation() {
    const now = new Date();

    try {
      const liveAuctions = await this.auctionRepository.find({
        where: { status: AuctionStatus.LIVE },
      });

      if (liveAuctions.length === 0) {
        return;
      }

      for (const auction of liveAuctions) {
        await this.dataSource.transaction(async (manager) => {
          await this.ensureActivePaintingForAuction(manager, auction, now);
        });
      }
    } catch (error) {
      this.logger.error(
        `rotate-auction-paintings failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
