import { createMachine, interpret, reduce, state, transition, update } from '../index';

test('basic state change', () => {
  const machine = createMachine({
    one: state(
      transition(
        'ping',
        'two',
        reduce((ctx) => ({ ...ctx, one: 1 })),
        reduce((ctx) => ({ ...ctx, two: 2 }))
      )
    ),
    two: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  expect(service.context).toEqual({ one: 1, two: 2 });

  const machine2 = createMachine({
    one: state(
      transition(
        'ping',
        'two',
        update<{ one: number; two: number }>((ctx) => {
          ctx.one = 1;
          ctx.two = 2;
        })
      )
    ),
    two: state(),
  });

  const service2 = interpret(machine2);
  service2.send('ping');
  expect(service2.context).toEqual({ one: 1, two: 2 });
});

test('if no reducers, the context remains', () => {
  const machine = createMachine(
    {
      one: state(transition('go', 'two')),
      two: state(),
    },
    () => ({ one: 1, two: 2 })
  );

  const service = interpret(machine);
  service.send('go');
  expect(service.context).toEqual({ one: 1, two: 2 });
});

test('event is the second argument', () => {
  const machine = createMachine({
    one: state(
      transition(
        'go',
        'two',
        reduce((ctx, ev) => {
          expect(ev).toEqual('go');
          return { ...ctx, worked: true };
        })
      )
    ),
    two: state(),
  });
  const service = interpret(machine);
  service.send('go');
  expect(service.context).toEqual({ worked: true });
});
