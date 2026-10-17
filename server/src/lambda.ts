import { app } from './index.js';

// AWS Lambda response streaming handler compatibility
declare const awslambda: {
  streamifyResponse: (
    handler: (event: any, responseStream: any, context: any) => Promise<void>
  ) => any;
  HttpResponseStream: {
    from: (stream: any, metadata: any) => any;
  };
};

export const handler = typeof awslambda !== 'undefined'
  ? awslambda.streamifyResponse(async (event: any, responseStream: any, context: any) => {
      // Direct stream routing for Lambda Function URL
      const metadata = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };

      const httpResponseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
      httpResponseStream.write(JSON.stringify({ message: 'MCP Lens Server on AWS Lambda' }));
      httpResponseStream.end();
    })
  : async (event: any) => {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'MCP Lens Server' }),
      };
    };
