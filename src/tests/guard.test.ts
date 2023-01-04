import { createMachine, guard, interpret, state, transition } from '../index';

test('can prevent changing states', () => {
  const deny = () => false;
  const machine = createMachine({
    one: state(transition('ping', 'two', guard(deny))),
    two: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  expect(service.machine.current).toBe('one');

  const allow = () => true;
  const machine2 = createMachine({
    one: state(transition('ping', 'two', guard(allow))),
    two: state(),
  });

  const service2 = interpret(machine2);
  service2.send('ping');
  expect(service2.machine.current).toBe('two');
});

test('if there are multiple guards, any returning false prevents a transition', () => {
  const deny = () => false;
  const allow = () => true;
  const machine = createMachine({
    one: state(transition('ping', 'two', guard(deny), guard(allow))),
    two: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  expect(service.machine.current).toBe('one');
});

test('guards are passed the event', () => {
  const machine = createMachine({
    one: state(
      transition(
        'ping',
        'two',
        guard<unknown, { canProceed: boolean }>((_, e) => e.canProceed)
      )
    ),
    two: state(),
  });

  const service = interpret(machine);
  service.send({ type: 'ping' });
  expect(service.machine.current).toBe('one');
  service.send({ type: 'ping', canProceed: true });
  expect(service.machine.current).toBe('two');
});
