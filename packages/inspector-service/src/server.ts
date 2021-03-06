import express from 'express';
import bodyParser from 'body-parser';
import { Types } from '@internet-of-people/sdk';

type AsyncRequestHandler = (req: express.Request, res: express.Response) => Promise<void>;

const handleAsync = (f: AsyncRequestHandler): express.RequestHandler => {
  return async(req, res, next): Promise<void> => {
    try {
      await f(req, res);
    } catch (err) {
      next(err);
    }
  };
};

const handleError = (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  console.error(err.stack);
  res.status(500).json(err.message);
};

const jsonBody = bodyParser.json({ limit: '1mb', type: '*/*' });

export class Server {
  public readonly app: express.Application;
  private readonly api: Types.Inspector.IApi;

  public constructor(api: Types.Inspector.IApi) {
    this.api = api;
    this.app = express();
    this.app.use(handleError);

    this.app.get('/scenarios', handleAsync(async(_, res): Promise<void> => {
      console.log('Serving scenarios...');
      const scenarios = await this.api.listScenarios();
      res.status(200).json({ scenarios });
    }));

    this.app.get('/blob/:contentId', handleAsync(async(req, res): Promise<void> => {
      const { contentId } = req.params;
      console.log(`Serving blob/${contentId}...`);

      try {
        const blob = await this.api.getPublicBlob(contentId);
        res.status(200).json(blob);
      } catch (err) {
        console.log(err);
        res.status(404).json(err.message);
      }
    }));

    this.app.post('/presentation', jsonBody, handleAsync(async(req, res): Promise<void> => {
      try {
        const contentId = await this.api.uploadPresentation(req.body);
        res.status(202).json({ contentId });
      } catch (err) {
        console.log(err);
        res.status(400).json(err.message);
      }
    }));

    this.app.get('/after-proof', handleAsync(async(_, res): Promise<void> => {
      try {
        console.log('Getting after-proof');
        const afterProof = await this.api.getAfterProof();
        res.status(200).json(afterProof);
      } catch (err) {
        console.log(err);
        res.status(502).json(err.message);
      }
    }));

    this.app.post('/validate', jsonBody, handleAsync(async(req, res): Promise<void> => {
      try {
        const validationResult = await this.api.validate(req.body);
        res.status(200).json(validationResult);
      } catch (err) {
        console.log(err);
        res.status(400).json(err.message);
      }
    }));
  }

  public start(port: number, hostname: string): void {
    this.app.listen(port, hostname, (): void => {
      console.log(`Listening on ${hostname}:${port}`);
    });
  }
}
