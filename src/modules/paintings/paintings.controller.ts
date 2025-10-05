import { Body, Controller, NotFoundException, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PaintingsService } from './paintings.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseService } from '../firebase/firebase.service';
import { memoryStorage } from 'multer';
import { UploadPaintingDto } from './dto/upload-painting.dto';

@Controller('api/paintings')
export class PaintingsController {
  constructor(
    private readonly paintingsService: PaintingsService,
    private readonly firebaseService: FirebaseService,
  ) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('data') data: UploadPaintingDto) {
    try {
      return this.paintingsService.uploadFile(file, data);
    } catch (error) {
      throw new Error(error.message || 'File upload failed');
    }
  }
}
