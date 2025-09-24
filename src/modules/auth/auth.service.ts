import { Injectable } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';

@Injectable()
export class AuthService {
  login(loginDto: LoginDTO) {
    throw new Error('Method not implemented.');
  }
  register(registerDto: RegisterDTO) {
    throw new Error('Method not implemented.');
  }
}
