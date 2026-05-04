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
import { Wallet, WalletStatus } from '../wallets/entities/wallet.entity';
import {
  Transaction,
  TransactionStatus,
} from '../payments/entities/transaction.entity';
import {
  CreateAuctionDto,
  PlaceBidDto,
  AddPaintingToAuctionDto,
  QueryAuctionDto,
  GetBidHistoryDto,
  BidHistoryStatus,
  UpdateAuctionStatusDto,
} from './dto';
import { PaintingsService } from '../paintings/paintings.service';

@Injectable()
export class AuctionsService {
  private static readonly ANTI_SNIPING_WINDOW_MS = 60_000;
  private static readonly ANTI_SNIPING_EXTENSION_MS = 60_000;
  private static readonly WITHDRAW_LOCK_MS = 2 * 24 * 60 * 60 * 1000;
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
    private readonly dataSource: DataSource,
    private readonly paintingsService: PaintingsService,
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

    await this.paintingsService.markPaintingInAuction(
      addPaintingDto.paintingId,
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

    const nextWithdrawalAvailableAt = new Date(
      Date.now() + AuctionsService.WITHDRAW_LOCK_MS,
    );
    const wallet = await this.auctionRepository.manager
      .getRepository(Wallet)
      .findOne({
        where: {
          accountId: userId,
          status: WalletStatus.ACTIVE,
        },
      });
    if (
      wallet &&
      (!wallet.withdrawalAvailableAt ||
        wallet.withdrawalAvailableAt < nextWithdrawalAvailableAt)
    ) {
      wallet.withdrawalAvailableAt = nextWithdrawalAvailableAt;
      await this.auctionRepository.manager.getRepository(Wallet).save(wallet);
    }

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
    ceilPrice: number | null;
    shouldEmitCeilPriceReached: boolean;
  }> {
    const { auctionPaintingId, bidAmount } = placeBidDto;
    return await this.dataSource.transaction(async (manager) => {
      const auctionPaintingRepo = manager.getRepository(AuctionPainting);
      const auctionRepo = manager.getRepository(Auction);
      const participantRepo = manager.getRepository(AuctionParticipant);
      const bidHistoryRepo = manager.getRepository(BidHistory);

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

      const bidderWallet = await this.getActiveWalletForUpdate(manager, userId);
      if (Number(bidderWallet.balance) < Number(bidAmount)) {
        throw new BadRequestException('Số dư ví không đủ để đặt giá');
      }

      const nextWithdrawalAvailableAt = new Date(
        now.getTime() + AuctionsService.WITHDRAW_LOCK_MS,
      );
      if (
        !bidderWallet.withdrawalAvailableAt ||
        bidderWallet.withdrawalAvailableAt < nextWithdrawalAvailableAt
      ) {
        bidderWallet.withdrawalAvailableAt = nextWithdrawalAvailableAt;
        await manager.getRepository(Wallet).save(bidderWallet);
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

      const hitOrExceedCeilPrice =
        activePainting.ceilPrice !== null &&
        activePainting.ceilPrice !== undefined &&
        bidAmount >= activePainting.ceilPrice;

      let shouldEmitCeilPriceReached = false;
      if (hitOrExceedCeilPrice) {
        const previousCeilHitCount = await bidHistoryRepo
          .createQueryBuilder('bidHistory')
          .where('bidHistory.auctionPaintingId = :auctionPaintingId', {
            auctionPaintingId: activePainting.auctionPaintingId,
          })
          .andWhere('bidHistory.bidderId = :bidderId', { bidderId: userId })
          .andWhere('bidHistory.bidAmount >= :ceilPrice', {
            ceilPrice: activePainting.ceilPrice,
          })
          .getCount();

        shouldEmitCeilPriceReached = previousCeilHitCount === 0;
      }

      activePainting.currentBid = bidAmount;
      activePainting.currentBidderId = userId;

      const remainingMs = paintingEndTime.getTime() - now.getTime();
      if (hitOrExceedCeilPrice) {
        activePainting.auctionEndTime = new Date(
          now.getTime() + AuctionsService.ANTI_SNIPING_EXTENSION_MS,
        );
      } else if (remainingMs <= AuctionsService.ANTI_SNIPING_WINDOW_MS) {
        paintingEndTime = new Date(
          paintingEndTime.getTime() + AuctionsService.ANTI_SNIPING_EXTENSION_MS,
        );
        activePainting.auctionEndTime = paintingEndTime;
      }

      await auctionPaintingRepo.save(activePainting);

      return {
        bidHistory,
        auctionPainting: activePainting,
        bidderFullName: participant.user?.fullName || null,
        ceilPrice: activePainting.ceilPrice,
        shouldEmitCeilPriceReached,
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
    ceilPrice: number | null;
    shouldEmitCeilPriceReached: boolean;
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

  async getAuctionRealtimeStatus(auctionId: number): Promise<{
    auctionId: number;
    auctionStatus: AuctionStatus;
    serverTime: Date;
    paintings: Array<{
      auctionPaintingId: number;
      paintingId: string;
      status: AuctionPaintingStatus;
      currentBid: number | null;
      currentBidderId: string | null;
      auctionStartTime: Date | null;
      auctionEndTime: Date | null;
      isSold: boolean;
      revoked: number;
    }>;
  }> {
    const now = new Date();

    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (
      auction.status === AuctionStatus.UPCOMING &&
      now >= auction.startTime &&
      now <= auction.endTime
    ) {
      auction.status = AuctionStatus.LIVE;
      await this.auctionRepository.save(auction);
    }

    if (auction.status === AuctionStatus.LIVE) {
      await this.dataSource.transaction(async (manager) => {
        await this.ensureActivePaintingForAuction(manager, auction, now);
      });
    }

    const paintings = await this.auctionPaintingRepository.find({
      where: { auctionId },
      order: { createdAt: 'ASC', auctionPaintingId: 'ASC' },
    });

    return {
      auctionId,
      auctionStatus: auction.status,
      serverTime: now,
      paintings: paintings.map((item) => ({
        auctionPaintingId: item.auctionPaintingId,
        paintingId: item.paintingId,
        status: item.status,
        currentBid: item.currentBid,
        currentBidderId: item.currentBidderId,
        auctionStartTime: item.auctionStartTime,
        auctionEndTime: item.auctionEndTime,
        isSold: item.isSold,
        revoked: item.revoked,
      })),
    };
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

  async getWonPaintingDetailByUserIdAndPaintingId(
    userId: string,
    paintingId: string,
  ): Promise<{
    auctionPaintingId: number;
    paintingId: string;
    auctionId: number;
    auctionTitle: string;
    auctionStartTime: Date | null;
    auctionEndTime: Date | null;
    finalBid: number | null;
    winnerId: string | null;
    painting: AuctionPainting['painting'];
    bidHistories: {
      bidHistoryId: number;
      bidAmount: number;
      bidTime: Date;
      status: string;
      bidder: {
        userId: string;
        fullName: string;
      } | null;
    }[];
  }> {
    const wonPainting = await this.auctionPaintingRepository
      .createQueryBuilder('auctionPainting')
      .leftJoinAndSelect('auctionPainting.auction', 'auction')
      .leftJoinAndSelect('auctionPainting.painting', 'painting')
      .where('auctionPainting.paintingId = :paintingId', {
        paintingId,
      })
      .andWhere('auctionPainting.currentBidderId = :userId', { userId })
      .andWhere('auction.status = :completedStatus', {
        completedStatus: AuctionStatus.END,
      })
      .getOne();

    if (!wonPainting) {
      throw new NotFoundException('Không tìm thấy tranh thắng đấu giá');
    }

    const bidHistories = await this.bidHistoryRepository.find({
      where: { auctionPaintingId: wonPainting.auctionPaintingId },
      relations: ['bidder'],
      order: { bidTime: 'DESC' },
    });

    return {
      auctionPaintingId: wonPainting.auctionPaintingId,
      paintingId: wonPainting.paintingId,
      auctionId: wonPainting.auctionId,
      auctionTitle: wonPainting.auction?.title,
      auctionStartTime: wonPainting.auctionStartTime,
      auctionEndTime: wonPainting.auctionEndTime,
      finalBid: wonPainting.currentBid,
      winnerId: wonPainting.currentBidderId,
      painting: wonPainting.painting,
      bidHistories: bidHistories.map((item) => ({
        bidHistoryId: item.bidHistoryId,
        bidAmount: item.bidAmount,
        bidTime: item.bidTime,
        status: item.status,
        bidder: item.bidder
          ? {
              userId: item.bidder.userId,
              fullName: item.bidder.fullName,
            }
          : null,
      })),
    };
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
        await this.debitWinnerWallet(
          manager,
          currentLivePainting.currentBidderId,
          Number(currentLivePainting.currentBid ?? 0),
          currentLivePainting.auctionPaintingId,
        );

        currentLivePainting.isSold = true;
        await this.paintingsService.markPaintingSoldToOwner(
          currentLivePainting.paintingId,
          currentLivePainting.currentBidderId,
          manager,
        );
      } else {
        await this.paintingsService.markPaintingReOpen(
          currentLivePainting.paintingId,
          manager,
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

  async updateAuction(
    auctionId: number,
    updateAuctionDto: any,
    userId: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (auction.auctioneerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật phiên đấu giá này',
      );
    }

    if (updateAuctionDto.startTime) {
      auction.startTime = new Date(updateAuctionDto.startTime);
    }
    if (updateAuctionDto.endTime) {
      auction.endTime = new Date(updateAuctionDto.endTime);
    }
    if (auction.endTime <= auction.startTime) {
      throw new BadRequestException('Thời kết thúc phải sau thời bắt đầu');
    }

    if (updateAuctionDto.title !== undefined) {
      auction.title = updateAuctionDto.title;
    }

    if (updateAuctionDto.auctioneerId !== undefined) {
      auction.auctioneerId = updateAuctionDto.auctioneerId;
    }

    await this.auctionRepository.save(auction);

    const result = await this.auctionRepository.findOne({
      where: { auctionId },
      relations: [
        'auctioneer',
        'auctionPaintings',
        'auctionPaintings.painting',
      ],
    });

    if (!result) {
      throw new NotFoundException('Không thể tải lại thông tin phiên đấu giá');
    }

    return result;
  }

  async updateAuctionPainting(
    auctionId: number,
    auctionPaintingId: number,
    updateDto: any,
    userId: string,
  ): Promise<AuctionPainting> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (auction.auctioneerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật tranh trong phiên đấu giá này',
      );
    }

    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId, auctionId },
      relations: ['painting', 'auction'],
    });

    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    if (updateDto.auctionDurationMinutes !== undefined) {
      auctionPainting.auctionDurationMinutes = updateDto.auctionDurationMinutes;
    }
    if (updateDto.auctionStartTime !== undefined) {
      auctionPainting.auctionStartTime = updateDto.auctionStartTime
        ? new Date(updateDto.auctionStartTime)
        : null;
    }
    if (updateDto.auctionEndTime !== undefined) {
      auctionPainting.auctionEndTime = updateDto.auctionEndTime
        ? new Date(updateDto.auctionEndTime)
        : null;
    }

    if (updateDto.basePrice !== undefined) {
      auctionPainting.basePrice = Number(updateDto.basePrice);
    }
    if (updateDto.ceilPrice !== undefined) {
      auctionPainting.ceilPrice =
        updateDto.ceilPrice === null ? null : Number(updateDto.ceilPrice);
    }
    if (
      auctionPainting.ceilPrice !== null &&
      auctionPainting.ceilPrice <= auctionPainting.basePrice
    ) {
      throw new BadRequestException('Giá trần phải lớn hơn giá khởi điểm');
    }
    if (updateDto.bidStep !== undefined) {
      auctionPainting.bidStep = Number(updateDto.bidStep);
    }
    if (updateDto.status !== undefined) {
      auctionPainting.status = updateDto.status;
    }
    if (updateDto.isSold !== undefined) {
      auctionPainting.isSold = !!updateDto.isSold;
    }
    if (updateDto.revoked !== undefined) {
      auctionPainting.revoked = Number(updateDto.revoked);
    }
    if (updateDto.currentBidderId !== undefined) {
      auctionPainting.currentBidderId = updateDto.currentBidderId;
    }

    const saved = await this.auctionPaintingRepository.save(auctionPainting);

    return saved;
  }

  async removePaintingFromAuction(
    auctionId: number,
    auctionPaintingId: number,
    userId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const auction = await this.auctionRepository.findOne({
      where: { auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá');
    }

    if (auction.auctioneerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền gỡ tranh từ phiên đấu giá này',
      );
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể gỡ tranh từ phiên đấu giá ở trạng thái nháp',
      );
    }

    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId, auctionId },
    });

    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.auctionPaintingRepository.remove(auctionPainting);
      await this.paintingsService.markPaintingReOpen(
        auctionPainting.paintingId,
        manager,
      );
    });

    return {
      success: true,
      message: 'Gỡ tranh khỏi phiên đấu giá thành công',
    };
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
    await this.dataSource.transaction(async (manager) => {
      const auctionRepo = manager.getRepository(Auction);
      const auctionPaintingRepo = manager.getRepository(AuctionPainting);

      auction.status = AuctionStatus.END;
      auction.endTime = now;
      await auctionRepo.save(auction);

      const soldPaintings = await auctionPaintingRepo.find({
        where: {
          auctionId,
          currentBidderId: Not(IsNull()),
          isSold: false,
        },
      });

      if (soldPaintings.length > 0) {
        for (const item of soldPaintings) {
          if (!item.currentBidderId) {
            continue;
          }

          await this.debitWinnerWallet(
            manager,
            item.currentBidderId,
            Number(item.currentBid ?? 0),
            item.auctionPaintingId,
          );
        }

        await auctionPaintingRepo.update(
          { auctionId, currentBidderId: Not(IsNull()), isSold: false },
          { isSold: true, status: AuctionPaintingStatus.END },
        );

        await Promise.all(
          soldPaintings.map((item) =>
            this.paintingsService.markPaintingSoldToOwner(
              item.paintingId,
              item.currentBidderId as string,
              manager,
            ),
          ),
        );
      }

      const unsoldPaintings = await auctionPaintingRepo.find({
        where: { auctionId, isSold: false },
      });

      if (unsoldPaintings.length > 0) {
        await auctionPaintingRepo.update(
          { auctionId, isSold: false },
          { status: AuctionPaintingStatus.END },
        );

        await this.paintingsService.markPaintingsReOpen(
          unsoldPaintings.map((item) => item.paintingId),
          manager,
        );
      }
    });

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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `rotate-auction-paintings failed: ${errorMessage}`,
        errorStack,
      );
    }
  }

  private async getActiveWalletForUpdate(
    manager: EntityManager,
    accountId: string,
  ): Promise<Wallet> {
    const wallet = await manager
      .getRepository(Wallet)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.account_id = :accountId', { accountId })
      .andWhere('wallet.status = :status', { status: WalletStatus.ACTIVE })
      .getOne();

    if (!wallet) {
      throw new BadRequestException('Ví không tồn tại hoặc không hoạt động');
    }

    return wallet;
  }

  private async debitWinnerWallet(
    manager: EntityManager,
    accountId: string,
    amount: number,
    auctionPaintingId: number,
  ): Promise<void> {
    const debitAmount = Number(amount || 0);
    if (debitAmount <= 0) {
      throw new BadRequestException(
        `Không thể trừ tiền cho tranh #${auctionPaintingId} vì giá cuối không hợp lệ`,
      );
    }

    const paymentNote = `Thanh toan dau gia tranh #${auctionPaintingId}`;
    const wallet = await this.getActiveWalletForUpdate(manager, accountId);

    const existingAuctionPayment = await manager
      .getRepository(Transaction)
      .findOne({
        where: {
          userId: accountId,
          status: TransactionStatus.SUCCESS,
          note: paymentNote,
        },
      });

    // Idempotency guard: avoid double charging the same winner for one painting.
    if (existingAuctionPayment) {
      return;
    }

    const currentBalance = Number(wallet.balance);

    if (currentBalance < debitAmount) {
      throw new BadRequestException(
        `Số dư ví không đủ để thanh toán tranh #${auctionPaintingId}`,
      );
    }

    wallet.balance = Number((currentBalance - debitAmount).toFixed(2));
    await manager.getRepository(Wallet).save(wallet);

    const transaction = manager.getRepository(Transaction).create({
      userId: accountId,
      amount: debitAmount,
      paymentDate: new Date(),
      status: TransactionStatus.SUCCESS,
      note: paymentNote,
    });
    await manager.getRepository(Transaction).save(transaction);
  }
}
