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
import { CreateAuctionDto, PlaceBidDto, AddPaintingToAuctionDto } from './dto';

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

  /**
   * Tạo phiên đấu giá mới
   */
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

  /**
   * Thêm tranh vào phiên đấu giá
   */
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

    // Kiểm tra trạng thái phiên đấu giá
    if (auction.status !== AuctionStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể thêm tranh vào phiên đấu giá đang chờ',
      );
    }

    // Validate giá
    if (
      addPaintingDto.ceilPrice &&
      addPaintingDto.ceilPrice <= addPaintingDto.basePrice
    ) {
      throw new BadRequestException('Giá trần phải lớn hơn giá khởi điểm');
    }

    // Kiểm tra tranh đã được thêm vào phiên này chưa
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

    // Load lại với relations
    const paintingWithRelations = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId: saved.auctionPaintingId },
      relations: ['painting', 'auction'],
    });

    if (!paintingWithRelations) {
      throw new NotFoundException('Không thể tải thông tin tranh đấu giá');
    }

    return paintingWithRelations;
  }

  /**
   * Tham gia phiên đấu giá
   */
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

    // Kiểm tra đã tham gia chưa
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

  /**
   * Đặt giá
   */
  async placeBid(
    placeBidDto: PlaceBidDto,
    userId: string,
  ): Promise<{ bidHistory: BidHistory; auctionPainting: AuctionPainting }> {
    const { auctionPaintingId, bidAmount } = placeBidDto;

    // Lấy thông tin tranh đấu giá
    const auctionPainting = await this.auctionPaintingRepository.findOne({
      where: { auctionPaintingId },
      relations: ['auction', 'painting'],
    });
    if (!auctionPainting) {
      throw new NotFoundException('Không tìm thấy tranh trong phiên đấu giá');
    }

    const auction = auctionPainting.auction;

    // Kiểm tra trạng thái phiên đấu giá
    if (auction.status !== AuctionStatus.ONGOING) {
      throw new BadRequestException('Phiên đấu giá không đang diễn ra');
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (now < auction.startTime || now > auction.endTime) {
      throw new BadRequestException('Phiên đấu giá không trong thời gian');
    }

    // Kiểm tra tranh đã bán chưa
    if (auctionPainting.isSold) {
      throw new BadRequestException('Tranh đã được bán');
    }

    // Kiểm tra đã tham gia phiên đấu giá chưa
    const participant = await this.auctionParticipantRepository.findOne({
      where: { auctionId: auction.auctionId, userId },
    });
    if (!participant) {
      throw new ForbiddenException(
        'Bạn phải tham gia phiên đấu giá trước khi đặt giá',
      );
    }

    // Validate giá đặt
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

    return { bidHistory, auctionPainting };
  }

  /**
   * Lấy chi tiết phiên đấu giá
   */
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
}
