import { PartialType } from '@nestjs/swagger';
import { CreateExhibitionDto } from './create-exhibition.dto';

export class UpdateExhibitionDto extends PartialType(CreateExhibitionDto) {}
