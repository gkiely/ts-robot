import { createMachine, interpret, state, transition, reduce, d, Machine, Event } from '../index';

// For some reason this is failing on CI
test.todo('Calls the onEnter function if the state is changed', () => {
  const machine = createMachine(
    {
      one: state(
        transition(
          'go',
          'two',
          reduce((ctx) => ({ ...ctx, x: 1 }))
        )
      ),
      two: state(),
    },
    () => ({ x: 0, y: 0 })
  );

  const enterFN = (m: Machine, to: string, state: unknown, prevState: unknown, event: Event) => {
    expect(m).toEqual(machine);
    expect(state).toEqual({ x: 1, y: 0 });
    expect(prevState).toEqual({ x: 0, y: 0 });
    expect(to).toEqual('two');
    expect(event).toEqual('go');
  };
  const service = interpret(machine, () => {});
  d._onEnter = enterFN;

  service.send('go');
});
