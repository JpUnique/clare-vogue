import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const requestIdMiddleware: RequestHandler = (_request, response, next) => {
  const providedId = _request.header('x-request-id');
  const requestId =
    providedId && REQUEST_ID_PATTERN.test(providedId) ? providedId : randomUUID();

  response.locals.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
};
