import { createMachine, interpret, invoke, state, transition, update } from '../index';

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

test.todo('goes to the error when there is an error', () => {});
