import { createMachine, guard, immediate, interpret, state, transition } from '../index';

test('will immediately transition', () => {
  const machine = createMachine({
    one: state(transition('ping', 'two')),
    two: state(immediate('three')),
    three: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  expect(service.machine.current).toBe('three');
});

test('will not transition when a guard fails', () => {
  const machine = createMachine({
    one: state(transition('ping', 'two')),
    two: state(
      immediate(
        'three',
        guard(() => false)
      ),
      transition('next', 'three')
    ),
    three: state(),
  });

  const service = interpret(machine);
  service.send('ping');
  expect(service.machine.current).toBe('two');
  service.send('next');
  expect(service.machine.current).toBe('three');
});

test('will immediately transition through 2 states', () => {
  const machine = createMachine({
    one: state(immediate('two')),
    two: state(immediate('three')),
    three: state(),
  });

  const service = interpret(machine);
  expect(service.machine.current).toBe('three');
});
