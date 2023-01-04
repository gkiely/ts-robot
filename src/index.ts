/* eslint-disable no-prototype-builtins */
import produce, { Draft } from 'immer';

/* eslint-disable fp/no-this */
function valueEnumerable(value: unknown) {
  return { enumerable: true, value };
}

function valueEnumerableWritable(value: unknown) {
  return { enumerable: true, writable: true, value };
}

type Fn<T = unknown, R = unknown> = (...args: T[]) => R;

type State = {
  final: boolean;
  enter: (machine: Machine, service: Service, event?: Event) => Machine;
  transitions: Map<string, Transition[]>;
};

type Machine = {
  current: string;
  context: (context: unknown, event?: Event) => unknown;
  original?: Machine | undefined;
  state: {
    name: string;
    value: State | undefined;
  };
  states: Record<string, State>;
};
type Service = {
  context: object;
  machine: Machine;
  child?: Service | undefined;
  send: (event: Event) => void;
  onChange: (service: Service) => void;
  transitions: Map<string, Transition[]>;
};
type Event =
  | {
      type: string;
      [key: string]: unknown;
    }
  | string;

type Transition = {
  from: string | null;
  to: string;
  fn: Fn;
  transitions: Transition[];
  guards: (context: unknown, event: Event) => boolean;
  reducers: (context: unknown, event: Event) => object;
};

export type GuardFunction<C, E> = (context: C, event: E) => boolean;
export type ActionFunction<C, E> = (context: C, event: E) => unknown;
export type ReduceFunction<C, E> = (context: C, event: E) => C;

export type Action<C, E> = {
  fn: ActionFunction<C, E>;
};

export type Reducer<C, E> = {
  fn: ReduceFunction<C, E>;
};

export type Guard<C, E> = {
  fn: GuardFunction<C, E>;
};

export const d = {} as {
  _send: (eventName: string, currentStateName: string) => void;
  _onEnter: (
    machine: Machine,
    to: string,
    context: unknown,
    serviceContext: unknown,
    fromEvent: Event
  ) => void;
  _create: (current: string, states: Machine['states']) => void;
};
const truthy = () => true;
const empty = () => ({});
const identity = (a: unknown) => a;
const callBoth = (par: Fn, fn: Fn, self: unknown, args: unknown[]) =>
  par.apply(self, args) && fn.apply(self, args);
const callForward = (par: Fn, fn: Fn, self: unknown, [a, b]: unknown[]) =>
  fn.call(self, par.call(self, a, b), b);
const create = <T extends object | null>(a: T, b: Parameters<typeof Object.create>[1]) =>
  Object.freeze(Object.create(a, b) as T);

function stack(
  fns: Fn[],
  def: Fn,
  caller: (par: Fn, fn: Fn, self: unknown, args: unknown[]) => unknown
) {
  return fns.reduce((par, fn) => {
    return function (this: unknown, ...args: unknown[]) {
      // eslint-disable-next-line no-invalid-this
      return caller(par, fn, this, args);
    };
  }, def);
}

function fnType(this: object | null, fn: Fn<object>) {
  // eslint-disable-next-line no-invalid-this
  return create(this, { fn: valueEnumerable(fn) });
}

const reduceType = {};
/// TODO: fix typing
export const reduce = fnType.bind(reduceType) as (
  fn: (c: object, e: unknown) => unknown
) => Transition;
export const action = (fn: (c: unknown, e: unknown) => unknown | void) =>
  // @ts-expect-error - TODO: fix typing
  reduce((ctx, ev) => Boolean(~fn(ctx, ev)) && ctx);

export const update = <C = unknown, E = unknown>(fn: (c: Draft<C>, e: E) => void) =>
  reduce((c, e) => produce(c, (c) => fn(c as Draft<C>, e as E)));

const guardType = {};
/// TODO: fix typing
export const guard = fnType.bind(guardType) as <C = object, E = unknown>(
  fn: (c: C, e: E) => unknown
) => Transition;

function filter(type: object, arr: Transition[]) {
  return arr.filter((value) => type.isPrototypeOf(value));
}

function makeTransition(this: Transition, from: string | null, to: string, ...args: Transition[]) {
  const guards = stack(
    filter(guardType, args).map((t) => t.fn),
    truthy,
    callBoth
  );
  const reducers = stack(
    filter(reduceType, args).map((t) => t.fn),
    identity,
    callForward
  );
  // eslint-disable-next-line no-invalid-this
  return create(this, {
    from: valueEnumerable(from),
    to: valueEnumerable(to),
    guards: valueEnumerable(guards),
    reducers: valueEnumerable(reducers),
  });
}

const transitionType = {} as Transition;
const immediateType = {} as Transition;
export const transition = makeTransition.bind(transitionType);
export const immediate = makeTransition.bind(immediateType, null);

function enterImmediate(
  this: { immediates: Transition[] },
  machine: Machine,
  service: Service,
  event: Event
) {
  // eslint-disable-next-line no-invalid-this
  const transition = transitionTo(service, machine, event, this.immediates);
  return transition || machine;
}

function transitionsToMap(transitions: Transition[]) {
  const m = new Map<string | null, Transition[]>();
  for (const t of transitions) {
    if (!m.has(t.from)) m.set(t.from, []);
    m.get(t.from)?.push(t);
  }
  return m;
}

// TODO: Fix typing
const stateType = { enter: identity } as unknown as State;
export function state(...args: Transition[]): State {
  const transitions = filter(transitionType, args);
  const immediates = filter(immediateType, args);
  const desc = {
    final: valueEnumerable(args.length === 0),
    transitions: valueEnumerable(transitionsToMap(transitions)),
    ...(immediates.length && {
      immediates: valueEnumerable(immediates),
      enter: valueEnumerable(enterImmediate),
    }),
  };
  return create(stateType, desc);
}

const invokeFnType = {
  enter(this: Transition, machine2: Machine, service: Service, event: Event) {
    const rn = this.fn.call(service, service.context, event) as Machine | Promise<unknown>;

    if (machine.isPrototypeOf(rn)) {
      const machine = create(invokeMachineType, {
        machine: valueEnumerable(rn),
        transitions: valueEnumerable(this.transitions),
      });
      return machine.enter(machine2, service, event);
    }

    if ('then' in rn) {
      rn.then((data) => service.send({ type: 'done', data })).catch((error: unknown) =>
        service.send({ type: 'error', error })
      );
    }
    return machine2;
  },
} as State;

const invokeMachineType = {
  enter(this: Service, machine: Machine, service: Service, event: Event) {
    service.child = interpret(
      this.machine,
      (s) => {
        service.onChange(s);
        if (service.child == s && s.machine.state.value?.final) {
          delete service.child;
          service.send({ type: 'done', data: s.context });
        }
      },
      service.context,
      event
    );
    if (service.child.machine.state.value?.final) {
      const data = service.child.context;
      delete service.child;
      const transition = this?.transitions.get('done');
      if (transition) return transitionTo(service, machine, { type: 'done', data }, transition);
    }
    return machine;
  },
} as State;

export function invoke(fn: Fn | Machine, ...transitions: Transition[]) {
  const t = valueEnumerable(transitionsToMap(transitions));
  return machine.isPrototypeOf(fn)
    ? create(invokeMachineType, {
        machine: valueEnumerable(fn),
        transitions: t,
      })
    : create(invokeFnType, {
        fn: valueEnumerable(fn),
        transitions: t,
      });
}

const machine: Machine = {
  context: () => {},
  current: '',
  states: {},
  get state() {
    return {
      name: this.current,
      value: this.states[this.current],
    } as Machine['state'];
  },
};

type Context = Fn<Record<string, unknown>>;

export function createMachine(states: Machine['states'], contextFn?: Context): Machine;
export function createMachine(
  current: string,
  states: Machine['states'],
  contextFn?: Context
): Machine;
export function createMachine(
  current: string | Machine['states'],
  states?: Machine['states'] | Context,
  contextFn: Context = empty
) {
  if (typeof current === 'string') {
    if (typeof states === 'object' && d._create) d._create(current, states);
    return create(machine, {
      context: valueEnumerable(contextFn),
      current: valueEnumerable(current),
      states: valueEnumerable(states),
    });
  }
  if (d._create) d._create(Object.keys(current)[0] ?? '', current);
  return create(machine, {
    context: valueEnumerable(states || empty),
    current: valueEnumerable(Object.keys(current)[0]),
    states: valueEnumerable(current),
  });
}

function transitionTo(
  service: Service,
  machine: Machine,
  fromEvent: Event,
  candidates: Transition[]
) {
  const { context } = service;
  for (const { to, guards, reducers } of candidates) {
    if (guards(context, fromEvent)) {
      service.context = reducers.call(service, context, fromEvent);

      const original = machine.original || machine;
      const newMachine = create(original, {
        current: valueEnumerable(to),
        original: { value: original },
      });

      if (d._onEnter) d._onEnter(machine, to, service.context, context, fromEvent);
      const state = newMachine.state.value;
      if (state) {
        return state.enter(newMachine, service, fromEvent);
      }
    }
  }
  return undefined;
}

function send(service: Service, event: Event) {
  const eventName = typeof event === 'string' ? event : event.type;
  const { machine } = service;
  const { value: state, name: currentStateName } = machine.state;

  const transition = state?.transitions.get(eventName);
  if (transition) {
    return transitionTo(service, machine, event, transition) || machine;
  } else if ('_send' in d) {
    d._send(eventName, currentStateName);
  }
  return machine;
}

const service: Service = {
  send(event: Event) {
    this.machine = send(this, event);
    // TODO detect change
    this.onChange?.(this);
  },
} as Service;

export function interpret(
  machine: Machine,
  onChange?: (service: Service) => void,
  initialContext?: object,
  event?: Event
): Service {
  const s = Object.create(service, {
    machine: valueEnumerableWritable(machine),
    context: valueEnumerableWritable(machine.context(initialContext, event)),
    onChange: valueEnumerable(onChange),
  }) as Service;
  s.send = s.send.bind(s);
  if (s.machine.state.value) {
    s.machine = s.machine.state.value.enter(s.machine, s, event);
  }
  return s;
}
