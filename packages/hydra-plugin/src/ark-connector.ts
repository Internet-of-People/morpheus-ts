import { IAppLog } from '@internet-of-people/logger';
import { IBlockEventSource, IBlockListener } from './block-event-source';
import { IInitializable } from './main';
import { Interfaces } from '@internet-of-people/did-manager';

export class MorpheusArkConnector implements IInitializable {
  public static readonly SUBSCRIPTION_ID: string = 'Morpheus block-handler';

  public constructor(
    private readonly eventEmitter: NodeJS.EventEmitter,
    private readonly log: IAppLog,
    private readonly blockHandler: IBlockListener,
    private readonly blockEventSource: IBlockEventSource,
  ) {}

  /* eslint @typescript-eslint/require-await: 0 */
  public async init(): Promise<void> {
    this.log.info('Starting up');

    this.blockEventSource.subscribe(MorpheusArkConnector.SUBSCRIPTION_ID, this.blockHandler);

    this.eventEmitter.on(Interfaces.MorpheusEvents.StateCorrupted, () => {
      this.blockEventSource.unsubscribe(MorpheusArkConnector.SUBSCRIPTION_ID);
      this.log.error('State is corrupted, BlockHandler is unsubscribed');
    });
  }
}
