import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GuardiansService } from './guardians.service';
import { RegisterDTO } from '../auth/dto/register.dto';

@ApiTags('Guardians')
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) { }

  @Post()
  @ApiOperation({
    summary: 'Register students and assign to guardian',
    description: 'Register multiple new students and assign them to a specific guardian. This creates user accounts for students and links them to the guardian.'
  })
  @ApiBody({
    description: 'Student registration data and guardian assignment',
    schema: {
      type: 'object',
      properties: {
        studentData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              username: { type: 'string', example: 'student123' },
              password: { type: 'string', example: 'password123' },
              fullName: { type: 'string', example: 'John Doe' },
              email: { type: 'string', format: 'email', example: 'student@example.com' },
              phone: { type: 'string', example: '+1234567890' },
              role: { type: 'string', enum: ['COMPETITOR'], example: 'COMPETITOR' }
            },
            required: ['username', 'password', 'fullName', 'email', 'role']
          },
          description: 'Array of student registration data (RegisterDTO objects)',
          minItems: 1
        },
        guardianId: {
          type: 'string',
          description: 'Guardian ID to assign the registered students to',
          example: 'uuid-guardian-id-here'
        }
      },
      required: ['studentData', 'guardianId']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Students successfully registered and assigned to guardian',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        message: {
          type: 'string',
          example: 'Students assigned to guardian successfully'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid registration data or guardian ID not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username or email already exists'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  assignStudentToGuardian(@Body() body: { studentData: Array<RegisterDTO>; guardianId: string }) {
    try {
      return this.guardiansService.assignStudentToGuardian(body.studentData, body.guardianId);

    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
