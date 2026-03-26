import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Auction,
  AuctionPainting,
  AuctionParticipant,
  BidHistory,
} from './entities';
import { AuctionStatus } from './entities/auction.entity';
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
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(AuctionPainting)
    private readonly auctionPaintingRepository: Repository<AuctionPainting>,
    @InjectRepository(AuctionParticipant)
    private readonly auctionParticipantRepository: Repository<AuctionParticipant>,
    @InjectRepository(BidHistory)
    private readonly bidHistoryRepository: Repository<BidHistory>,
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
      status: AuctionStatus.PENDING,
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

    if (auction.status !== AuctionStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể thêm tranh vào phiên đấu giá đang chờ',
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

    const auctionPainting = this.auctionPaintingRepository.create({
      auctionId,
      paintingId: addPaintingDto.paintingId,
      basePrice: addPaintingDto.basePrice,
      ceilPrice: addPaintingDto.ceilPrice,
      bidStep: addPaintingDto.bidStep,
      currentBid: addPaintingDto.basePrice,
      isSold: false,
      revoked: 0,
    });

    const saved = await this.auctionPaintingRepository.save(auctionPainting);

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

    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId },
      relations: ['auction', 'painting'],
    });
    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    const auction = auctionPainting.auction;

    if (auction.status !== AuctionStatus.ONGOING) {
      throw new BadRequestException('Phiên đấu giá không đang diễn ra');
    }

    const now = new Date();
    if (now < auction.startTime || now > auction.endTime) {
      throw new BadRequestException('Phiên đấu giá không trong thời gian');
    }

    if (auctionPainting.isSold) {
      throw new BadRequestException('Tranh đã được bán');
    }

    const participant = await this.auctionParticipantRepository.findOne({
      where: { auctionId: auction.auctionId, userId },
      relations: ['user'],
    });
    if (!participant) {
      throw new ForbiddenException(
        'Bạn phải tham gia phiên đấu giá trước khi đặt giá',
      );
    }

    const currentBid = auctionPainting.currentBid || auctionPainting.basePrice;
    const minBid = currentBid + auctionPainting.bidStep;

    if (bidAmount < minBid) {
      throw new BadRequestException(
        `Giá đặt phải ít nhất ${minBid.toLocaleString('vi-VN')} VNĐ`,
      );
    }

    // Kiểm tra giá trần
    if (auctionPainting.ceilPrice && bidAmount > auctionPainting.ceilPrice) {
      throw new BadRequestException(
        `Giá đặt không được vượt quá giá trần ${auctionPainting.ceilPrice.toLocaleString('vi-VN')} VNĐ`,
      );
    }

    // Cập nhật bid histories cũ thành OUTBID
    await this.bidHistoryRepository.update(
      {
        auctionPaintingId,
        status: 'ACTIVE',
      },
      { status: 'OUTBID' },
    );

    // Tạo bid history mới
    const bidHistory = this.bidHistoryRepository.create({
      auctionPaintingId,
      bidderId: userId,
      bidAmount,
      status: 'ACTIVE',
    });
    await this.bidHistoryRepository.save(bidHistory);

    // Cập nhật auction painting
    auctionPainting.currentBid = bidAmount;
    auctionPainting.currentBidderId = userId;
    await this.auctionPaintingRepository.save(auctionPainting);

    return {
      bidHistory,
      auctionPainting,
      bidderFullName: participant.user?.fullName || null,
    };
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

    const queryBuilder = this.auctionRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.auctioneer', 'auctioneer')
      .leftJoinAndSelect('auction.auctionPaintings', 'auctionPaintings')
      .leftJoinAndSelect('auctionPaintings.painting', 'painting');

    if (status) {
      queryBuilder.andWhere('auction.status = :status', { status });
    }

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

    return auction;
  }

  async getWonPaintingsByUserId(userId: string): Promise<
    {
      auctionPaintingId: number;
      auctionId: number;
      auctionTitle: string;
      auctionEndTime: Date;
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
        completedStatus: AuctionStatus.COMPLETED,
      })
      .orderBy('auction.endTime', 'DESC')
      .getMany();

    return wonAuctionPaintings.map((item) => ({
      auctionPaintingId: item.auctionPaintingId,
      auctionId: item.auctionId,
      auctionTitle: item.auction?.title,
      auctionEndTime: item.auction?.endTime,
      finalBid: item.currentBid,
      painting: item.painting,
    }));
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
      order: { createdAt: 'ASC' },
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
      [AuctionStatus.PENDING]: [AuctionStatus.ONGOING, AuctionStatus.CANCELLED],
      [AuctionStatus.ONGOING]: [
        AuctionStatus.COMPLETED,
        AuctionStatus.CANCELLED,
      ],
      [AuctionStatus.COMPLETED]: [],
      [AuctionStatus.CANCELLED]: [],
    };

    if (!validTransitions[auction.status].includes(status)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${auction.status} sang ${status}`,
      );
    }

    if (status === AuctionStatus.ONGOING) {
      const now = new Date();
      if (now < auction.startTime) {
        throw new BadRequestException(
          'Không thể bắt đầu đấu giá trước thời gian khởi đầu',
        );
      }
      if (now > auction.endTime) {
        throw new BadRequestException(
          'Không thể bắt đầu đấu giá sau thời gian kết thúc',
        );
      }
    }

    auction.status = status;
    const updatedAuction = await this.auctionRepository.save(auction);

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
}
