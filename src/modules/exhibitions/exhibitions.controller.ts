import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ExhibitionsService } from './exhibitions.service';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { UpdateExhibitionDto } from './dto/update-exhibition.dto';
import { AddPaintingsToExhibitionDto } from './dto/add-paintings.dto';

@Controller('api/exhibitions')
@ApiTags('Exhibitions')
export class ExhibitionsController {
  constructor(private readonly exhibitionsService: ExhibitionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo triển lãm mới',
    description: 'Staff tạo một triển lãm mới để trưng bày các tác phẩm',
  })
  @ApiBody({ type: CreateExhibitionDto })
  @ApiResponse({
    status: 201,
    description: 'Exhibition created successfully',
  })
  create(@Body() createExhibitionDto: CreateExhibitionDto) {
    return this.exhibitionsService.create(createExhibitionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả triển lãm',
    description:
      'Lấy danh sách tất cả các triển lãm, sắp xếp theo ngày tạo. Có thể filter theo status.',
  })
  @ApiQuery({
    name: 'status',
    description: 'Lọc theo trạng thái triển lãm',
    required: false,
    enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
    example: 'ACTIVE',
  })
  @ApiResponse({
    status: 200,
    description: 'Exhibitions retrieved successfully',
  })
  findAll(@Query('status') status?: string) {
    return this.exhibitionsService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một triển lãm',
    description: 'Lấy thông tin triển lãm kèm danh sách các paintings',
  })
  @ApiParam({
    name: 'id',
    description: 'Exhibition ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Exhibition retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exhibition not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exhibitionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật thông tin triển lãm',
    description: 'Cập nhật thông tin của một triển lãm',
  })
  @ApiParam({
    name: 'id',
    description: 'Exhibition ID',
    example: 1,
  })
  @ApiBody({ type: UpdateExhibitionDto })
  @ApiResponse({
    status: 200,
    description: 'Exhibition updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exhibition not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExhibitionDto: UpdateExhibitionDto,
  ) {
    return this.exhibitionsService.update(id, updateExhibitionDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa triển lãm',
    description: 'Xóa một triển lãm và tất cả paintings liên quan',
  })
  @ApiParam({
    name: 'id',
    description: 'Exhibition ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Exhibition deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exhibition not found',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.exhibitionsService.remove(id);
  }

  @Post(':id/paintings')
  @ApiOperation({
    summary: 'Thêm paintings vào triển lãm',
    description:
      'Thêm nhiều paintings vào triển lãm. Tự động cập nhật số lượng paintings.',
  })
  @ApiParam({
    name: 'id',
    description: 'Exhibition ID',
    example: 1,
  })
  @ApiBody({ type: AddPaintingsToExhibitionDto })
  @ApiResponse({
    status: 200,
    description: 'Paintings added to exhibition successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Some paintings do not exist or already in exhibition',
  })
  @ApiResponse({
    status: 404,
    description: 'Exhibition not found',
  })
  addPaintings(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPaintingsDto: AddPaintingsToExhibitionDto,
  ) {
    return this.exhibitionsService.addPaintings(id, addPaintingsDto);
  }

  @Delete(':exhibitionId/paintings/:paintingId')
  @ApiOperation({
    summary: 'Xóa painting khỏi triển lãm',
    description: 'Xóa một painting khỏi triển lãm. Tự động giảm số lượng.',
  })
  @ApiParam({
    name: 'exhibitionId',
    description: 'Exhibition ID',
    example: 1,
  })
  @ApiParam({
    name: 'paintingId',
    description: 'Painting ID',
    example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @ApiResponse({
    status: 200,
    description: 'Painting removed from exhibition successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Painting not found in exhibition',
  })
  removePainting(
    @Param('exhibitionId', ParseIntPipe) exhibitionId: number,
    @Param('paintingId') paintingId: string,
  ) {
    return this.exhibitionsService.removePainting(exhibitionId, paintingId);
  }

  @Get(':id/paintings')
  @ApiOperation({
    summary: 'Lấy danh sách paintings trong triển lãm',
    description:
      'Lấy tất cả các paintings trong triển lãm, kèm thông tin award nếu có',
  })
  @ApiParam({
    name: 'id',
    description: 'Exhibition ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Exhibition paintings retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exhibition not found',
  })
  getPaintingsByExhibition(@Param('id', ParseIntPipe) id: number) {
    return this.exhibitionsService.getPaintingsByExhibition(id);
  }
}
