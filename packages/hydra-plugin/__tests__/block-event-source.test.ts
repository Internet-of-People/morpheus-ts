/* eslint max-classes-per-file: 0 */
/* eslint @typescript-eslint/unbound-method: 0 */
import { EventEmitter } from 'events';

import { ApplicationEvents } from '@arkecosystem/core-event-emitter';
import { Interfaces as CryptoIf } from '@arkecosystem/crypto';
import { Crypto } from '@internet-of-people/sdk';
import { IAppLog, IBlockListener } from '@internet-of-people/hydra-plugin-core';

import { BlockEventSource } from '../src/block-event-source';
import { Scheduler, Task } from '../src/scheduler';

const { log } = Crypto;

class DummyScheduler {
  private tasks: [string, Task][];

  public constructor() {
    this.tasks = [];
  }

  public get(): Scheduler {
    return this.schedule.bind(this);
  }

  public dump(): void {
    log(`tasks pending: ${ JSON.stringify(this.tasks.map((name, _) => {
      return name;
    }))}`);
  }

  public schedule(_: IAppLog, name: string, task: Task): void {
    this.tasks.push([ name, task ]);
  }

  public async runAll(): Promise<void> {
    const tasks = this.tasks.slice(0);
    this.tasks = [];

    for (const [ , task ] of tasks) {
      await task();
    }
  }
}

class Fixture {
  public emitter: NodeJS.EventEmitter = new EventEmitter();
  public scheduler = new DummyScheduler();

  public logMock = {
    appName: 'hot-wallet-tests',
    debug: jest.fn<void, [string]>(),
    info: jest.fn<void, [string]>(),
    warn: jest.fn<void, [string]>(),
    error: jest.fn<void, [string]>(),
  };
  public log = this.logMock as IAppLog;

  public createListener(): IBlockListener {
    return {
      onBlockApplied: jest.fn<Promise<void>, [CryptoIf.IBlockData]>(),
      onBlockReverted: jest.fn<Promise<void>, [CryptoIf.IBlockData]>(),
    };
  }

  /** Creates the system under test with all its dependencies mocked */
  public createSut(): BlockEventSource {
    return new BlockEventSource(
      this.log,
      this.emitter,
      this.scheduler.get(),
    );
  }
}

describe('BlockEventSource', () => {
  const block = { id: 'id1' };
  let fixture: Fixture;

  beforeEach(() => {
    fixture = new Fixture();
  });

  it('constructor does not subscribe to emitter', () => {
    fixture.createSut();

    expect(fixture.emitter.listenerCount(ApplicationEvents.BlockApplied)).toBe(0);
    expect(fixture.emitter.listenerCount(ApplicationEvents.BlockReverted)).toBe(0);
  });

  it('init subscribes to emitter', async() => {
    const sut = fixture.createSut();

    await sut.init();

    expect(fixture.emitter.listenerCount(ApplicationEvents.BlockApplied))
      .toBe(1);
    expect(fixture.emitter.listenerCount(ApplicationEvents.BlockReverted))
      .toBe(1);
  });

  it('Listeners are called asynchronously via Scheduler', async() => {
    const sut = fixture.createSut();

    await sut.init();

    const listener = fixture.createListener();
    sut.subscribe('listener', listener);

    fixture.emitter.emit(ApplicationEvents.BlockApplied, block);
    expect(listener.onBlockApplied).not.toBeCalled();

    await fixture.scheduler.runAll();
    expect(listener.onBlockApplied).toBeCalledWith(block);
  });

  it('Listeners are called asynchronously in order via Scheduler', async() => {
    const sut = fixture.createSut();

    await sut.init();

    const callOrder: number[] = [];

    const listener1 = fixture.createListener();
    const listener2 = fixture.createListener();
    const listener3 = fixture.createListener();

    jest.spyOn(listener1, 'onBlockApplied').mockImplementation(async() => {
      callOrder.push(1);
    });
    jest.spyOn(listener2, 'onBlockApplied').mockImplementation(async() => {
      callOrder.push(2);
    });
    jest.spyOn(listener3, 'onBlockApplied').mockImplementation(async() => {
      callOrder.push(3);
    });

    sut.subscribe('listener1', listener1);
    sut.subscribe('listener2', listener2);
    sut.subscribe('listener3', listener3);

    fixture.emitter.emit(ApplicationEvents.BlockApplied, block);
    expect(listener1.onBlockApplied).not.toBeCalled();
    expect(listener2.onBlockApplied).not.toBeCalled();
    expect(listener3.onBlockApplied).not.toBeCalled();

    await fixture.scheduler.runAll();
    expect(callOrder).toEqual([ 1, 2, 3 ]);
  });

  it('listener can unsubscribe', async() => {
    const sut = fixture.createSut();
    await sut.init();

    const listener = fixture.createListener();
    sut.subscribe('listener', listener);

    fixture.emitter.emit(ApplicationEvents.BlockApplied, block);
    expect(listener.onBlockApplied).not.toBeCalled();
    await fixture.scheduler.runAll();
    expect(listener.onBlockApplied).toBeCalledTimes(1);

    sut.unsubscribe('listener');
    fixture.emitter.emit(ApplicationEvents.BlockApplied, block);
    await fixture.scheduler.runAll();
    expect(listener.onBlockApplied).toBeCalledTimes(1);
  });
});
