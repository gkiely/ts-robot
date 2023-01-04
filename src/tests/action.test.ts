import { action, createMachine, interpret, state, transition } from '../index';

test('can be used to do side effects', () => {
  let count = 0;
  const orig = {};

  const machine = createMachine(
    {
      one: state(
        transition(
          'ping',
          'two',
          action(() => count++)
        )
      ),
    },
    () => orig
  );

  const service = interpret(machine);
  service.send('ping');
  expect(count).toBe(1);
  expect(service.context).toEqual(orig);
});
