import { createMachine, interpret, invoke, reduce, state, transition } from '../index';
export function assertType<T>(_: unknown): asserts _ is T {}

test('basic state change', () => {
  const machine = createMachine({
    one: state(transition('ping', 'two')),
    two: state(transition('pong', 'one')),
  });
  const cb = vi.fn();
  const service = interpret(machine, cb);
  expect(service.machine.current).toBe('one');
  service.send('ping');
  expect(service.machine.current).toBe('two');
  service.send('pong');
  expect(service.machine.current).toBe('one');
  expect(cb).toHaveBeenCalled();
});

test('data can be passed into the initial context', () => {
  const machine = createMachine(
    {
      one: state(),
    },
    (event) => ({
      foo: event.foo,
    })
  );

  const service = interpret(machine, () => {}, { foo: 'bar' });
  assertType<{ foo: string }>(service.context);
  expect(service.context.foo).toBe('bar');
});

test('first argument sets the initial state', () => {
  const machine = createMachine('two', {
    one: state(transition('next', 'two')),
    two: state(transition('next', 'one')),
    three: state(transition('next', 'one')),
  });
  const service = interpret(machine);
  expect(service.machine.current).toBe('two');

  const machine2 = createMachine('two', {
    one: state(transition('next', 'two')),
    two: state(),
  });
  const service2 = interpret(machine2);
  expect(service2.machine.current).toBe('two');
  expect(service2.machine.state.value?.final).toBe(true);
});

test('child machines recive the event used to invoke them', () => {
  const child = createMachine(
    {
      final: state(),
    },
    (_, e) => ({ count: e.count })
  );

  const parent = createMachine({
    start: state(transition('next', 'next')),
    next: invoke(
      child,
      transition(
        'done',
        'end',
        reduce((ctx, e) => ({
          ...ctx,
          // @ts-expect-error - TODO: fix typing
          ...e.data,
        }))
      )
    ),
    end: state(),
  });

  const service = interpret(parent);
  service.send({ type: 'next', count: 1 });
  assertType<{ count: number }>(service.context);
  expect(service.context.count).toBe(1);
});
