import { createMachine, interpret, state, transition, d } from '../index';

test("Errors for transitions to states that don't exist", () => {
  try {
    createMachine({
      one: state(transition('go', 'two')),
    });
  } catch (e) {
    const message =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : '';
    expect(/unknown state/.test(message)).toBe(true);
  }
});

test('Does not error for transitions to states when state does exist', () => {
  try {
    createMachine({
      one: state(transition('go', 'two')),
      two: state(),
    });
  } catch (e) {
    expect.fail();
  }
});

test('Errors if an invalid initial state is provided', () => {
  try {
    createMachine('oops', {
      one: state(),
    });
  } catch (e) {
    expect.fail();
  }
});

test('Errors when no transitions for event from the current state', () => {
  try {
    const machine = createMachine('one', {
      one: state(),
    });
    const { send } = interpret(machine);
    d._send = () => {};
    send('go');
    expect.fail();
  } catch {}
});
