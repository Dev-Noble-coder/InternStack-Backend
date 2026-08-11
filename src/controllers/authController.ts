import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(response: Response, access: string, refresh: string): void {
    const options = {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
      path: '/',
    };
    response.cookie(config.ACCESS_COOKIE_NAME, access, { ...options, maxAge: 15 * 60 * 1000 });
    response.cookie(config.REFRESH_COOKIE_NAME, refresh, { ...options, maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

  register = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await this.authService.register(request.body);
      response.status(201).json({ user });
    } catch (error) { next(error); }
  };

  verifyEmail = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await this.authService.verifyEmail(request.body.email, request.body.code);
      response.json({ user });
    } catch (error) { next(error); }
  };

  resendVerification = async (request: Request, response: Response, next: NextFunction) => {
    try {
      await this.authService.resendVerification(request.body.email);
      response.json({ message: 'If the account exists, a verification code was sent' });
    } catch (error) { next(error); }
  };

  login = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(request.body.email, request.body.password, {
        ip: request.ip,
        userAgent: request.get('user-agent'),
      });
      this.setAuthCookies(response, result.access, result.refresh);
      response.json({ user: result.user });
    } catch (error) { next(error); }
  };

  refresh = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await this.authService.refresh(request.cookies?.[config.REFRESH_COOKIE_NAME]);
      this.setAuthCookies(response, result.access, result.refresh);
      response.json({ message: 'Session refreshed' });
    } catch (error) { next(error); }
  };

  me = async (request: AuthRequest, response: Response, next: NextFunction) => {
    try { response.json({ user: await this.authService.me(request.identity!.userId) }); }
    catch (error) { next(error); }
  };

  logout = async (request: Request, response: Response, next: NextFunction) => {
    try {
      await this.authService.logout(request.cookies?.[config.REFRESH_COOKIE_NAME]);
      const options = { httpOnly: true, secure: config.COOKIE_SECURE, sameSite: config.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none', path: '/' };
      response.clearCookie(config.ACCESS_COOKIE_NAME, options);
      response.clearCookie(config.REFRESH_COOKIE_NAME, options);
      response.json({ message: 'Logged out' });
    } catch (error) { next(error); }
  };

  forgotPassword = async (request: Request, response: Response, next: NextFunction) => {
    try { await this.authService.forgotPassword(request.body.email); response.json({ message: 'If the account exists, a reset code was sent' }); }
    catch (error) { next(error); }
  };

  verifyPasswordReset = async (request: Request, response: Response, next: NextFunction) => {
    try { await this.authService.verifyReset(request.body.email, request.body.code); response.json({ message: 'Code verified' }); }
    catch (error) { next(error); }
  };

  resetPassword = async (request: Request, response: Response, next: NextFunction) => {
    try { await this.authService.resetPassword(request.body.email, request.body.code, request.body.password); response.json({ message: 'Password reset successfully' }); }
    catch (error) { next(error); }
  };
}