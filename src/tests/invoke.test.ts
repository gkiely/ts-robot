import {
  createMachine,
  interpret,
  invoke,
  state,
  state as final,
  transition,
  update,
  reduce,
  immediate,
} from '../index';
import { assertType } from '../helpers';

test('goes to done event when complete', async () => {
  const machine = createMachine({
    one: state(transition('ping', 'two')),
    two: invoke(
      () => Promise.resolve(2),
      transition(
        'done',
        'three',
        update<{ age: number }, { data: number }>((c, e) => {
          c.age = e.data;
        })
      )
    ),
    three: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  await Promise.resolve();
  expect(service.machine.current).toBe('three');
  expect(service.context).toEqual({ age: 2 });
});

test('goes to the error when there is an error', async () => {
  type Error = {
    error: {
      message: 'custom error';
    };
  };

  const machine = createMachine({
    one: state(transition('ping', 'two')),
    two: invoke(
      () => Promise.reject(new Error('custom error')),
      transition(
        'error',
        'three',
        update<Error, Error>((c, e) => {
          c.error = e.error;
        })
      )
    ),
    three: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  await Promise.resolve();
  await Promise.resolve();
  assertType<Error>(service.context);
  expect(service.context.error).toMatchObject({
    message: 'custom error',
  });
});

test('The initial state can be an invoke', async () => {
  const machine = createMachine(
    {
      one: invoke(
        () => Promise.resolve(2),
        transition(
          'done',
          'two',
          update<{ age: number }, { data: number }>((ctx, e) => {
            ctx.age = e.data;
          })
        )
      ),
      two: state(),
    },
    () => ({ age: 0 })
  );

  const service = interpret(machine, () => {});
  await Promise.resolve();
  assertType<{ age: number }>(service.context);
  expect(service.context.age).toBe(2);
  expect(service.machine.current).toBe('two');
});

test('Can invoke a child machine', () => {
  const one = createMachine({
    nestedOne: state(transition('go', 'nestedTwo')),
    nestedTwo: state(),
  });

  const two = createMachine({
    one: state(transition('go', 'two')),
    two: invoke(one, transition('done', 'three')),
    three: state(),
  });

  let c = 0;
  const service = interpret(two, (thisService) => {
    switch (c) {
      case 0:
        assert.equal(service.machine.current, 'two');
        break;
      case 1:
        assert.notEqual(thisService, service, 'second time a different service');
        break;
      case 2:
        assert.equal(service.machine.current, 'three', 'now in three state');
        break;
      default:
        break;
    }
    c++;
  });

  service.send('go');
  service.child?.send('go');
  assert.equal(c, 3, 'there were 3 transitions');
});

test('Can invoke a dynamic child machine', () => {
  const dynamicMachines = [
    createMachine({
      nestedOne: state(transition('go', 'nestedTwo')),
      nestedTwo: final(),
    }),
    createMachine({
      nestedThree: state(transition('go', 'nestedFour')),
      nestedFour: final(),
    }),
  ];

  const root = createMachine({
    one: state(transition('go', 'two')),
    two: invoke(() => dynamicMachines[0], transition('done', 'three')),
    three: state(transition('go', 'four')),
    four: invoke(() => dynamicMachines[1], transition('done', 'five')),
    five: final(),
  });
  let c = 0;
  const service = interpret(root, (thisService) => {
    switch (c) {
      case 0:
        assert.equal(service.machine.current, 'two');
        break;
      case 1:
        assert.notEqual(thisService, service, 'second time a different service');
        assert.equal(thisService.machine.current, 'nestedTwo');
        break;
      case 2:
        assert.equal(thisService, service, 'equal service');
        assert.equal(service.machine.current, 'three', 'now in three state');
        break;
      case 3:
        assert.equal(service.machine.current, 'four');
        break;
      case 4:
        assert.notEqual(thisService, service, 'third time a different service');
        assert.equal(thisService.machine.current, 'nestedFour');
        break;
      case 5:
        assert.equal(service.machine.current, 'five', 'now in five state');
        break;
      default:
        break;
    }
    c++;
  });
  service.send('go');
  service.child?.send('go');
  service.send('go');
  service.child?.send('go');
  assert.equal(c, 6, 'there were 6 transitions');
});

test('Child machines receive events from their parents', async () => {
  const action = (fn: (c: object, e: unknown) => void) =>
    reduce((ctx, ev) => {
      fn(ctx, ev);
      return ctx;
    });

  const wait = (ms: number) => () => new Promise((resolve) => setTimeout(resolve, ms));

  const child = createMachine(
    {
      init: state(
        immediate(
          'waiting',
          action((ctx) => {
            // @ts-expect-error - TODO fix type
            // eslint-disable-next-line
            ctx.stuff.push(1);
          })
        )
      ),
      waiting: invoke(
        wait(50),
        transition(
          'done',
          'fin',
          action((ctx) => {
            // @ts-expect-error - TODO fix type
            // eslint-disable-next-line
            ctx.stuff.push(2);
          })
        )
      ),
      fin: state(),
    },
    (ctx) => ctx
  );

  const machine = createMachine(
    {
      idle: state(transition('next', 'child')),
      child: invoke(child, transition('done', 'end')),
      end: state(),
    },
    () => ({ stuff: [] })
  );

  const service = interpret(machine, () => {});
  service.send('next');

  await wait(50)();
  assertType<{ stuff: number[] }>(service.context);
  assert.deepEqual(service.context.stuff, [1, 2]);
});

test('Service does not have a child when not in an invoked state', () => {
  const child = createMachine({
    nestedOne: state(transition('next', 'nestedTwo')),
    nestedTwo: state(),
  });
  const parent = createMachine({
    one: invoke(child, transition('done', 'two')),
    two: state(),
  });

  const service = interpret(parent, () => {});
  assert.ok(service.child, 'there is a child service');

  service.child?.send('next');
  assert.notOk(service.child, 'No longer a child');
});

test('Multi level nested machines resolve in correct order', () => {
  const four = createMachine({
    init: state(transition('START', 'start')),
    start: state(transition('DONE', 'done')),
    done: state(),
  });

  const three = createMachine({
    init: state(transition('START', 'start')),
    start: invoke(four, transition('done', 'done')),
    done: state(),
  });

  const two = createMachine({
    init: state(transition('START', 'start')),
    start: invoke(three, transition('done', 'done')),
    done: state(),
  });

  const one = createMachine({
    init: state(transition('START', 'start')),
    start: invoke(two, transition('done', 'done')),
    done: state(),
  });

  let c = 0;
  const service = interpret(one, (thisService) => {
    switch (c) {
      case 0:
        assert.equal(service.machine.current, 'start', 'initial state');
        break;
      case 1:
        assert.notEqual(
          thisService.machine.states,
          service.machine.states,
          'second time a different service'
        );
        assert.ok(service.child, 'has child');
        assert.equal(service.child?.machine.current, 'start');
        break;
      case 2:
        assert.ok(service.child?.child, 'has grand child');
        assert.equal(service.child?.machine.current, 'start');
        assert.equal(service.child?.child?.machine.current, 'start');
        break;
      case 3:
        assert.ok(service.child?.child?.child, 'has grand grand child');
        assert.equal(service.child?.child?.machine.current, 'start');
        assert.equal(service.child?.child?.child?.machine.current, 'start');
        break;
      case 4:
        assert.equal(service.child?.child?.child?.machine.current, 'done');
        break;
      case 5:
        assert.equal(service.child?.child?.machine.current, 'done');
        assert.equal(service.child?.child?.child, undefined, 'child is removed when resolved');
        break;
      case 6:
        assert.equal(service.child?.machine.current, 'done');
        assert.equal(service.child?.child, undefined, 'child is removed when resolved');
        break;
      case 7:
        assert.equal(service.machine.current, 'done');
        assert.equal(service.child, undefined, 'child is removed when resolved');
        break;
      default:
        break;
    }
    c++;
  });
  service.send('START'); // machine one
  service.child?.send('START'); // machine two
  service.child?.child?.send('START'); // machine tree
  service.child?.child?.child?.send('START'); // machine four
  service.child?.child?.child?.send('DONE'); // machine four
  assert.equal(c, 8, 'there were 6 transitions');
});

test('Invoking a machine that immediately finishes', () => {
  const child = createMachine({
    nestedOne: state(immediate('nestedTwo')),
    nestedTwo: final(),
  });

  const parent = createMachine({
    one: state(transition('next', 'two')),
    two: invoke(child, transition('done', 'three')),
    three: final(),
  });

  const service = interpret(parent, (s) => {
    // TODO not totally sure if this is correct, but I think it should
    // hit this only once and be equal to three
    assert.equal(s.machine.current, 'three');
  });

  service.send('next');
});
