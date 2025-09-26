import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';

@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }
  @Post('login')
  async login(@Body() loginDto: LoginDTO): Promise<{ access_token: string }> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDTO): Promise<any> {
    return this.authService.register(registerDto);
  }
}
