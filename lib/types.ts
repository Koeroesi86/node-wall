import type { Readable } from 'stream';

export type RequestHeaders = Record<string, string | undefined>;

export interface LambdaEvent {
  httpMethod?: string;
  pathFragments: string[];
  headers: RequestHeaders;
  queryStringParameters?: Record<string, string | undefined>;
  remoteAddress?: string;
  bodyStream: Readable;
}

export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}

export type LambdaCallback = (response: LambdaResponse) => void;

export interface PageProps {
  language?: string;
  sessionId?: string;
}
