import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  requestId: string;
  timestamp: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = response.locals.requestId ?? 'unavailable';
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const errorName =
      exception instanceof Error ? exception.name : 'UnknownException';

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'http_request_failed',
          requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode,
          errorName,
        }),
      );
    }

    const body = this.createErrorBody(
      statusCode,
      exceptionResponse,
      request.originalUrl,
      requestId,
    );

    response.status(statusCode).json(body);
  }

  private createErrorBody(
    statusCode: number,
    exceptionResponse: string | object | undefined,
    path: string,
    requestId: string,
  ): ApiErrorBody {
    const response =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : undefined;
    const rawMessage =
      response && 'message' in response ? response.message : exceptionResponse;
    const message =
      typeof rawMessage === 'string' ||
      (Array.isArray(rawMessage) &&
        rawMessage.every((item) => typeof item === 'string'))
        ? rawMessage
        : statusCode >= 500
          ? 'Internal server error'
          : 'Request failed';
    const error =
      response &&
      'error' in response &&
      typeof response.error === 'string'
        ? response.error
        : statusCode >= 500
          ? 'Internal Server Error'
          : 'Request Error';

    return {
      statusCode,
      error,
      message,
      path,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }
}
