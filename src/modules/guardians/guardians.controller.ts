import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GuardiansService } from './guardians.service';
import { RegisterDTO } from '../auth/dto/register.dto';

@ApiTags('Guardians')
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) { }

  @Post("assign-competitors")
  @ApiOperation({
    summary: 'Register competitors and assign to guardian',
    description: 'Register multiple new competitors and assign them to a specific guardian. This creates user accounts for competitors and links them to the guardian.'
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
              role: { type: 'string', enum: ['COMPETITOR'], example: 'COMPETITOR' },
              birthday: { type: 'string', format: 'date', example: '2010-05-15' },
              schoolName: { type: 'string', example: 'ABC Elementary School' },
              ward: { type: 'string', example: 'Ward 1' },
              grade: { type: 'string', example: 'Grade 5' }
            },
            required: ['username', 'password', 'fullName', 'email', 'role', 'birthday', 'schoolName', 'ward', 'grade']
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


  @Get('competitors/:guardianId')
  @ApiOperation({
    summary: 'Get all competitors assigned to a guardian',
    description: 'Retrieve a list of all competitors who are assigned to a specific guardian.'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved competitors assigned to the guardian',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              competitorId: {
                type: 'string',
                description: 'Competitor ID (same as user ID)',
                example: 'uuid-competitor-id-here'
              },
              birthday: {
                type: 'string',
                format: 'date',
                description: 'Competitor birthday',
                example: '2010-05-15'
              },
              schoolName: {
                type: 'string',
                description: 'Name of the school',
                example: 'ABC Elementary School'
              },
              ward: {
                type: 'string',
                description: 'Ward/district information',
                example: 'Ward 1'
              },
              grade: {
                type: 'string',
                description: 'Competitor grade level',
                example: 'Grade 5'
              },
              guardianId: {
                type: 'string',
                description: 'Guardian ID assigned to this competitor',
                example: 'uuid-guardian-id-here'
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Guardian ID not found'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  getStudentsByGuardian(@Param('guardianId') guardianId: string) {
    try {
      return this.guardiansService.getStudentsByGuardian(guardianId);
    } catch (error) {
      throw new NotFoundException('Guardian not found');
    }
  }
}
