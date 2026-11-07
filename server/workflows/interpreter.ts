// Code node interpreter - written by the platform. Do not edit.
// It runs the code nodes of the workflows. Their TypeScript is compiled by the
// platform into a tree (the "program" of the node); this interpreter walks that
// tree. Nothing else runs: no require, no process, no network, no files, no
// timers. A program has a budget of steps, of time and of memory.

export interface RunLimits {
  /** Evaluation steps at most. */
  steps: number;
  /** Milliseconds at most. */
  ms: number;
  /** Cells allocated at most (an item of a list, a property, a character / 16). */
  cells: number;
  /** Nested calls at most. */
  depth: number;
}

export const DEFAULT_LIMITS: RunLimits = { steps: 2000000, ms: 1000, cells: 4000000, depth: 200 };

type Node = Record<string, unknown> & { t: string };

class Closure {
  readonly params: unknown[];
  readonly body: unknown;
  readonly arrow: boolean;
  readonly scope: Scope;
  constructor(params: unknown[], body: unknown, arrow: boolean, scope: Scope) {
    this.params = params;
    this.body = body;
    this.arrow = arrow;
    this.scope = scope;
  }
}

class Builtin {
  readonly name: string;
  readonly fn: (...args: unknown[]) => unknown;
  readonly construct: boolean;
  readonly members: Record<string, unknown>;
  constructor(name: string, fn: (...args: unknown[]) => unknown, members: Record<string, unknown> = {}, construct = false) {
    this.name = name;
    this.fn = fn;
    this.members = members;
    this.construct = construct;
  }
}

class Scope {
  readonly vars = new Map<string, { value: unknown; constant: boolean }>();
  readonly parent: Scope | null;
  constructor(parent: Scope | null) {
    this.parent = parent;
  }
  find(name: string): { value: unknown; constant: boolean } | undefined {
    const v = this.vars.get(name);
    if (v !== undefined) return v;
    return this.parent === null ? undefined : this.parent.find(name);
  }
  declare(name: string, value: unknown, constant: boolean): void {
    if (this.vars.has(name)) throw new Error("\"" + name + "\" is declared twice.");
    this.vars.set(name, { value: value, constant: constant });
  }
}

class Return {
  readonly value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}
class Break {}
class Continue {}
class Thrown {
  readonly value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}

const FORBIDDEN = new Set(["constructor", "__proto__", "prototype", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "caller", "callee", "arguments"]);

const STRING_METHODS = new Set([
  "at", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith", "includes", "indexOf", "lastIndexOf", "localeCompare",
  "normalize", "padEnd", "padStart", "repeat", "replace", "replaceAll", "slice", "split", "startsWith", "substring",
  "toLowerCase", "toUpperCase", "toLocaleLowerCase", "toLocaleUpperCase", "toString", "trim", "trimEnd", "trimStart",
]);
const ARRAY_METHODS = new Set([
  "at", "concat", "every", "fill", "filter", "find", "findIndex", "findLast", "findLastIndex", "flat", "flatMap", "forEach",
  "includes", "indexOf", "join", "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice",
  "some", "sort", "splice", "unshift",
]);
const NUMBER_METHODS = new Set(["toFixed", "toPrecision", "toString"]);
const DATE_METHODS = new Set([
  "getDate", "getDay", "getFullYear", "getHours", "getMilliseconds", "getMinutes", "getMonth", "getSeconds", "getTime",
  "getTimezoneOffset", "getUTCDate", "getUTCDay", "getUTCFullYear", "getUTCHours", "getUTCMinutes", "getUTCMonth",
  "getUTCSeconds", "toISOString", "toJSON", "toString", "valueOf",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)
    && !(value instanceof Closure) && !(value instanceof Builtin);
}

function own(o: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, key);
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  if (value instanceof Closure || value instanceof Builtin) return "a function";
  return typeof value;
}

class Machine {
  private steps = 0;
  private cells = 0;
  private depth = 0;
  private readonly started = Date.now();
  private readonly limits: RunLimits;
  readonly globals: Scope;

  constructor(limits: RunLimits, inputs: Record<string, unknown>) {
    this.limits = limits;
    this.globals = new Scope(null);
    const g = (name: string, value: unknown): void => this.globals.declare(name, value, true);
    const pure = (name: string, fn: (...args: unknown[]) => unknown, members: Record<string, unknown> = {}): Builtin => new Builtin(name, fn, members);
    const math: Record<string, unknown> = { PI: Math.PI, E: Math.E };
    for (const name of ["abs", "ceil", "floor", "round", "trunc", "sign", "sqrt", "cbrt", "pow", "min", "max", "log", "log10", "log2", "exp", "sin", "cos", "tan", "atan2", "hypot", "random"]) {
      const fn = (Math as unknown as Record<string, (...a: unknown[]) => unknown>)[name]!;
      math[name] = pure("Math." + name, (...a) => fn.apply(Math, a));
    }
    g("Math", pure("Math", () => { throw new Error("Math is not a function."); }, math));
    g("JSON", pure("JSON", () => { throw new Error("JSON is not a function."); }, {
      stringify: pure("JSON.stringify", (v, _r, space) => {
        const text = JSON.stringify(this.toPlain(v), null, typeof space === "number" ? Math.min(10, space) : undefined);
        this.allocate(text === undefined ? 0 : text.length / 16);
        return text;
      }),
      parse: pure("JSON.parse", (text) => {
        if (typeof text !== "string") throw new Error("JSON.parse expects a text.");
        this.allocate(text.length / 16);
        return this.clean(JSON.parse(text));
      }),
    }));
    g("Object", pure("Object", () => { throw new Error("Object is not a function."); }, {
      keys: pure("Object.keys", (o) => (isPlainObject(o) || Array.isArray(o) ? Object.keys(o) : [])),
      values: pure("Object.values", (o) => (isPlainObject(o) || Array.isArray(o) ? Object.values(o) : [])),
      entries: pure("Object.entries", (o) => (isPlainObject(o) || Array.isArray(o) ? Object.entries(o) : [])),
      fromEntries: pure("Object.fromEntries", (list) => {
        const out: Record<string, unknown> = {};
        if (!Array.isArray(list)) throw new Error("Object.fromEntries expects a list of pairs.");
        for (const pair of list) {
          if (!Array.isArray(pair)) continue;
          this.setProperty(out, String(pair[0]), pair[1]);
        }
        return out;
      }),
      assign: pure("Object.assign", (target, ...sources) => {
        if (!isPlainObject(target)) throw new Error("Object.assign expects an object.");
        for (const source of sources) if (isPlainObject(source)) for (const k of Object.keys(source)) this.setProperty(target, k, source[k]);
        return target;
      }),
    }));
    g("Array", pure("Array", () => { throw new Error("Use [] to make a list."); }, {
      isArray: pure("Array.isArray", (v) => Array.isArray(v)),
      from: pure("Array.from", (v, map) => {
        const items: unknown[] = Array.isArray(v) ? v.slice() : typeof v === "string" ? v.split("") : isPlainObject(v) && typeof v.length === "number" ? Array.from({ length: Math.min(100000, Math.max(0, v.length)) }, () => undefined) : [];
        this.allocate(items.length);
        return map === undefined ? items : items.map((item, index) => this.callValue(map, [item, index]));
      }),
    }));
    g("Number", pure("Number", (v) => Number(v), {
      isInteger: pure("Number.isInteger", (v) => Number.isInteger(v)),
      isFinite: pure("Number.isFinite", (v) => Number.isFinite(v)),
      isNaN: pure("Number.isNaN", (v) => Number.isNaN(v)),
      parseFloat: pure("Number.parseFloat", (v) => Number.parseFloat(String(v))),
      parseInt: pure("Number.parseInt", (v, r) => Number.parseInt(String(v), typeof r === "number" ? r : 10)),
      MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
      MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    }));
    g("String", pure("String", (v) => String(v === undefined ? "" : this.toPlainText(v))));
    g("Boolean", pure("Boolean", (v) => Boolean(v)));
    g("parseInt", pure("parseInt", (v, r) => Number.parseInt(String(v), typeof r === "number" ? r : 10)));
    g("parseFloat", pure("parseFloat", (v) => Number.parseFloat(String(v))));
    g("isNaN", pure("isNaN", (v) => Number.isNaN(Number(v))));
    g("isFinite", pure("isFinite", (v) => Number.isFinite(Number(v))));
    g("Date", new Builtin("Date", (...a) => (a.length === 0 ? new Date() : new Date(a[0] as string | number)), {
      now: pure("Date.now", () => Date.now()),
      parse: pure("Date.parse", (v) => Date.parse(String(v))),
    }, true));
    g("Error", new Builtin("Error", (m) => {
      const error: Record<string, unknown> = {};
      this.setProperty(error, "name", "Error");
      this.setProperty(error, "message", m === undefined ? "" : this.toPlainText(m));
      return error;
    }, {}, true));
    g("undefined", undefined);
    g("NaN", NaN);
    g("Infinity", Infinity);
    g("inputs", inputs);
  }

  tick(): void {
    this.steps += 1;
    if (this.steps > this.limits.steps) throw new Error("The code ran too long (more than " + this.limits.steps + " steps): is there a loop that never ends?");
    if ((this.steps & 4095) === 0 && Date.now() - this.started > this.limits.ms) throw new Error("The code ran longer than " + this.limits.ms + " ms.");
  }

  allocate(cells: number): void {
    this.cells += Math.max(0, cells);
    if (this.cells > this.limits.cells) throw new Error("The code used too much memory.");
  }

  /** A value from outside (JSON.parse) becomes plain objects and lists, nothing else. */
  clean(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.clean(v));
    if (typeof value === "object" && value !== null) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(value)) this.setProperty(out, k, this.clean((value as Record<string, unknown>)[k]));
      return out;
    }
    return value;
  }

  toPlainText(v: unknown): string {
    if (v instanceof Closure || v instanceof Builtin) return "[function]";
    if (typeof v === "object" && v !== null && !(v instanceof Date)) return JSON.stringify(this.toPlain(v));
    return String(v);
  }

  /** What leaves the interpreter: JSON values only. */
  toPlain(v: unknown): unknown {
    if (v instanceof Closure || v instanceof Builtin) return undefined;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
    if (Array.isArray(v)) return v.map((x) => {
      const p = this.toPlain(x);
      return p === undefined ? null : p;
    });
    if (isPlainObject(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v)) {
        const p = this.toPlain(v[k]);
        if (p !== undefined) out[k] = p;
      }
      return out;
    }
    if (typeof v === "number" && !Number.isFinite(v)) return null;
    return v;
  }

  setProperty(o: Record<string, unknown> | unknown[], key: string, value: unknown): void {
    if (FORBIDDEN.has(key)) throw new Error("The property \"" + key + "\" cannot be written.");
    if (Array.isArray(o)) {
      if (key === "length") {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0 || n > 1000000) throw new Error("Invalid list length.");
        if (n > o.length) this.allocate(n - o.length);
        o.length = n;
        return;
      }
      if (!/^\d+$/.test(key)) throw new Error("A list only has numbered items.");
      const index = Number(key);
      if (index > 1000000) throw new Error("The list is too long.");
      if (index >= o.length) this.allocate(index - o.length + 1);
      o[index] = value;
      return;
    }
    if (!own(o, key)) this.allocate(1);
    Object.defineProperty(o, key, { value: value, writable: true, enumerable: true, configurable: true });
  }

  getProperty(o: unknown, key: string): unknown {
    if (FORBIDDEN.has(key)) throw new Error("The property \"" + key + "\" cannot be read.");
    if (o === null || o === undefined) throw new Error("Cannot read \"" + key + "\" of " + String(o) + ".");
    if (typeof o === "string") {
      if (key === "length") return o.length;
      if (/^\d+$/.test(key)) return o.charAt(Number(key)) || undefined;
      if (STRING_METHODS.has(key)) return this.method(o, key);
      return undefined;
    }
    if (typeof o === "number") return NUMBER_METHODS.has(key) ? this.method(o, key) : undefined;
    if (typeof o === "boolean") return key === "toString" ? this.method(o, key) : undefined;
    if (Array.isArray(o)) {
      if (key === "length") return o.length;
      if (/^\d+$/.test(key)) return o[Number(key)];
      if (ARRAY_METHODS.has(key)) return this.method(o, key);
      return undefined;
    }
    if (o instanceof Date) return DATE_METHODS.has(key) ? this.method(o, key) : undefined;
    if (o instanceof Builtin) return own(o.members, key) ? o.members[key] : undefined;
    if (o instanceof Closure) return undefined;
    if (isPlainObject(o)) return own(o, key) ? o[key] : undefined;
    return undefined;
  }

  /** A method of a string, a number, a list or a date, bound to its value. Functions given to it run here. */
  method(target: unknown, name: string): Builtin {
    return new Builtin(name, (...args) => {
      const host = args.map((a) => (a instanceof Closure || a instanceof Builtin ? (...inner: unknown[]) => this.callValue(a, inner) : a));
      if (typeof target === "string" && (name === "replace" || name === "replaceAll") && typeof host[0] !== "string") {
        throw new Error("replace takes a text to look for (regular expressions are not available).");
      }
      if (typeof target === "string" && name === "split" && host[0] !== undefined && typeof host[0] !== "string") {
        throw new Error("split takes a text separator (regular expressions are not available).");
      }
      if (typeof target === "string" && (name === "repeat" || name === "padStart" || name === "padEnd")) {
        const size = Number(host[0]) * (name === "repeat" ? target.length : 1);
        if (!Number.isFinite(size) || size > 1000000) throw new Error("The text would be too long.");
      }
      const fn = (target as Record<string, (...a: unknown[]) => unknown>)[name]!;
      const result = fn.apply(target, host);
      if (typeof result === "string") this.allocate(result.length / 16);
      else if (Array.isArray(result)) this.allocate(result.length);
      return result;
    });
  }

  callValue(callee: unknown, args: unknown[]): unknown {
    this.tick();
    if (callee instanceof Builtin) return callee.fn(...args);
    if (!(callee instanceof Closure)) throw new Error(describe(callee) + " is not a function.");
    this.depth += 1;
    if (this.depth > this.limits.depth) throw new Error("Too many nested calls.");
    try {
      const scope = new Scope(callee.scope);
      callee.params.forEach((p, i) => this.bind(p, args[i], scope, false));
      if (callee.arrow && !Array.isArray(callee.body)) return this.expr(callee.body as Node, scope);
      try {
        this.block(callee.body as Node[], scope);
      } catch (signal) {
        if (signal instanceof Return) return signal.value;
        throw signal;
      }
      return undefined;
    } finally {
      this.depth -= 1;
    }
  }

  bind(pattern: unknown, value: unknown, scope: Scope, constant: boolean): void {
    const p = pattern as Node;
    if (p.t === "pid") {
      scope.declare(String(p.n), value === undefined && p.d !== undefined ? this.expr(p.d as Node, scope) : value, constant);
      return;
    }
    const v = value === undefined && p.d !== undefined ? this.expr(p.d as Node, scope) : value;
    if (p.t === "pobj") {
      if (v === null || v === undefined) throw new Error("Cannot read the fields of " + String(v) + ".");
      const used = new Set<string>();
      for (const prop of p.props as Node[]) {
        const key = String(prop.k);
        used.add(key);
        this.bind(prop.p, this.getProperty(v, key), scope, constant);
      }
      if (p.rest !== undefined) {
        const rest: Record<string, unknown> = {};
        if (isPlainObject(v)) for (const k of Object.keys(v)) if (!used.has(k)) this.setProperty(rest, k, v[k]);
        scope.declare(String(p.rest), rest, constant);
      }
      return;
    }
    if (p.t === "parr") {
      const items = Array.isArray(v) ? v : typeof v === "string" ? v.split("") : null;
      if (items === null) throw new Error("Cannot read the items of " + describe(v) + ".");
      (p.items as (Node | null)[]).forEach((item, i) => {
        if (item !== null) this.bind(item, items[i], scope, constant);
      });
      if (p.rest !== undefined) scope.declare(String(p.rest), items.slice((p.items as unknown[]).length), constant);
      return;
    }
    throw new Error("Unknown pattern.");
  }

  hoist(body: Node[], scope: Scope): void {
    for (const s of body) {
      if (s.t === "fn" && typeof s.name === "string") scope.declare(s.name, new Closure(s.params as unknown[], s.body, false, scope), false);
    }
  }

  block(body: Node[], scope: Scope): void {
    this.hoist(body, scope);
    for (const s of body) this.stmt(s, scope);
  }

  loopBody(body: Node[], scope: Scope): "break" | "continue" | null {
    try {
      this.block(body, new Scope(scope));
    } catch (signal) {
      if (signal instanceof Break) return "break";
      if (signal instanceof Continue) return "continue";
      throw signal;
    }
    return null;
  }

  stmt(s: Node, scope: Scope): void {
    this.tick();
    switch (s.t) {
      case "var":
        for (const d of s.decls as Node[]) this.bind(d.p, d.init === undefined ? undefined : this.expr(d.init as Node, scope), scope, s.kind === "const");
        return;
      case "fn":
        return;
      case "expr":
        this.expr(s.e as Node, scope);
        return;
      case "block":
        this.block(s.body as Node[], new Scope(scope));
        return;
      case "if":
        if (this.truthy(this.expr(s.test as Node, scope))) this.block(s.then as Node[], new Scope(scope));
        else if (s.else !== undefined) this.block(s.else as Node[], new Scope(scope));
        return;
      case "return":
        throw new Return(s.e === undefined ? undefined : this.expr(s.e as Node, scope));
      case "break":
        throw new Break();
      case "continue":
        throw new Continue();
      case "throw": {
        const value = this.expr(s.e as Node, scope);
        throw new Thrown(value);
      }
      case "while":
        while (this.truthy(this.expr(s.test as Node, scope))) {
          if (this.loopBody(s.body as Node[], scope) === "break") break;
        }
        return;
      case "do":
        do {
          if (this.loopBody(s.body as Node[], scope) === "break") break;
        } while (this.truthy(this.expr(s.test as Node, scope)));
        return;
      case "for": {
        const loop = new Scope(scope);
        if (s.init !== undefined) this.stmt(s.init as Node, loop);
        while (s.test === undefined || this.truthy(this.expr(s.test as Node, loop))) {
          // Each turn sees its own copy of the loop variables, as in JavaScript.
          const turn = new Scope(loop.parent);
          for (const [k, v] of loop.vars) turn.vars.set(k, { value: v.value, constant: v.constant });
          const signal = this.loopBody(s.body as Node[], turn);
          for (const [k, v] of turn.vars) loop.vars.set(k, v);
          if (signal === "break") break;
          if (s.update !== undefined) this.expr(s.update as Node, loop);
        }
        return;
      }
      case "forOf":
      case "forIn": {
        const source = this.expr(s.of as Node, scope);
        let items: unknown[];
        if (s.t === "forIn") items = isPlainObject(source) || Array.isArray(source) ? Object.keys(source) : [];
        else if (Array.isArray(source)) items = source.slice();
        else if (typeof source === "string") items = source.split("");
        else throw new Error("for...of needs a list or a text, not " + describe(source) + ".");
        for (const item of items) {
          const turn = new Scope(scope);
          this.bind(s.p, item, turn, s.kind === "const");
          if (this.loopBody(s.body as Node[], turn) === "break") break;
        }
        return;
      }
      case "try": {
        try {
          this.block(s.body as Node[], new Scope(scope));
        } catch (error) {
          if (error instanceof Return || error instanceof Break || error instanceof Continue) throw error;
          if (s.handler === undefined) throw error;
          if (error instanceof Error && /ran too long|ran longer|too much memory|Too many nested/.test(error.message)) throw error;
          const caught = new Scope(scope);
          if (s.param !== undefined) {
            const value = error instanceof Thrown ? error.value : { message: error instanceof Error ? error.message : String(error) };
            this.bind(s.param, value, caught, false);
          }
          this.block(s.handler as Node[], caught);
        } finally {
          if (s.finalizer !== undefined) this.block(s.finalizer as Node[], new Scope(scope));
        }
        return;
      }
      default:
        throw new Error("Unknown statement " + s.t + ".");
    }
  }

  truthy(v: unknown): boolean {
    return Boolean(v);
  }

  lookup(name: string, scope: Scope): unknown {
    const v = scope.find(name);
    if (v === undefined) throw new Error("\"" + name + "\" is not defined.");
    return v.value;
  }

  assign(target: Node, value: unknown, scope: Scope): void {
    if (target.t === "id") {
      const v = scope.find(String(target.n));
      if (v === undefined) throw new Error("\"" + String(target.n) + "\" is not defined.");
      if (v.constant) throw new Error("\"" + String(target.n) + "\" is a constant.");
      v.value = value;
      return;
    }
    if (target.t === "mem") {
      const o = this.expr(target.o as Node, scope);
      const key = target.c === true ? this.key(this.expr(target.p as Node, scope)) : String(target.p);
      if (!(isPlainObject(o) || Array.isArray(o))) throw new Error("Cannot write \"" + key + "\" on " + describe(o) + ".");
      this.setProperty(o, key, value);
      return;
    }
    throw new Error("Cannot assign to this.");
  }

  key(v: unknown): string {
    if (typeof v === "number" || typeof v === "string") return String(v);
    throw new Error("A property name is a text or a number.");
  }

  binary(op: string, l: unknown, r: unknown): unknown {
    switch (op) {
      case "+": {
        if (typeof l === "string" || typeof r === "string") {
          const text = this.toPlainText(l) + this.toPlainText(r);
          this.allocate(text.length / 16);
          return text;
        }
        return (l as number) + (r as number);
      }
      case "-": return (l as number) - (r as number);
      case "*": return (l as number) * (r as number);
      case "/": return (l as number) / (r as number);
      case "%": return (l as number) % (r as number);
      case "**": return (l as number) ** (r as number);
      case "==": return l == r;
      case "!=": return l != r;
      case "===": return l === r;
      case "!==": return l !== r;
      case "<": return (l as number) < (r as number);
      case ">": return (l as number) > (r as number);
      case "<=": return (l as number) <= (r as number);
      case ">=": return (l as number) >= (r as number);
      case "&": return (l as number) & (r as number);
      case "|": return (l as number) | (r as number);
      case "^": return (l as number) ^ (r as number);
      case "<<": return (l as number) << (r as number);
      case ">>": return (l as number) >> (r as number);
      case ">>>": return (l as number) >>> (r as number);
      case "in": return (isPlainObject(r) || Array.isArray(r)) && own(r, this.key(l));
      default: throw new Error("Unknown operator " + op + ".");
    }
  }

  args(list: Node[], scope: Scope): unknown[] {
    const out: unknown[] = [];
    for (const a of list) {
      if (a.t === "spread") {
        const v = this.expr(a.e as Node, scope);
        if (!Array.isArray(v)) throw new Error("Only a list can be spread here.");
        out.push(...v);
      } else out.push(this.expr(a, scope));
    }
    return out;
  }

  expr(e: Node, scope: Scope): unknown {
    this.tick();
    switch (e.t) {
      case "lit": return e.v;
      case "undef": return undefined;
      case "id": return this.lookup(String(e.n), scope);
      case "tpl": {
        const quasis = e.quasis as string[];
        const exprs = e.exprs as Node[];
        let text = quasis[0] ?? "";
        for (let i = 0; i < exprs.length; i++) text += this.toPlainText(this.expr(exprs[i]!, scope)) + (quasis[i + 1] ?? "");
        this.allocate(text.length / 16);
        return text;
      }
      case "arr": {
        const items = this.args(e.items as Node[], scope);
        this.allocate(items.length + 1);
        return items;
      }
      case "obj": {
        const out: Record<string, unknown> = {};
        this.allocate(1);
        for (const p of e.props as Node[]) {
          if (p.t === "spread") {
            const v = this.expr(p.e as Node, scope);
            if (isPlainObject(v)) for (const k of Object.keys(v)) this.setProperty(out, k, v[k]);
            else if (Array.isArray(v)) v.forEach((x, i) => this.setProperty(out, String(i), x));
            continue;
          }
          const key = p.computed !== undefined ? this.key(this.expr(p.computed as Node, scope)) : String(p.k);
          this.setProperty(out, key, this.expr(p.v as Node, scope));
        }
        return out;
      }
      case "mem": {
        const o = this.expr(e.o as Node, scope);
        if (e.opt === true && (o === null || o === undefined)) return undefined;
        const key = e.c === true ? this.key(this.expr(e.p as Node, scope)) : String(e.p);
        return this.getProperty(o, key);
      }
      case "call": {
        const f = e.f as Node;
        const callee = this.expr(f, scope);
        if (e.opt === true && (callee === null || callee === undefined)) return undefined;
        return this.callValue(callee, this.args(e.args as Node[], scope));
      }
      case "new": {
        const callee = this.expr(e.f as Node, scope);
        if (!(callee instanceof Builtin) || !callee.construct) throw new Error("Only new Date() and new Error() are available.");
        return callee.fn(...this.args(e.args as Node[], scope));
      }
      case "un": {
        if (e.op === "typeof" && (e.e as Node).t === "id" && scope.find(String((e.e as Node).n)) === undefined) return "undefined";
        const v = this.expr(e.e as Node, scope);
        switch (e.op) {
          case "!": return !v;
          case "-": return -(v as number);
          case "+": return +(v as number);
          case "~": return ~(v as number);
          case "typeof": return v instanceof Closure || v instanceof Builtin ? "function" : typeof v;
          case "void": return undefined;
          default: throw new Error("Unknown operator " + String(e.op) + ".");
        }
      }
      case "bin": return this.binary(String(e.op), this.expr(e.l as Node, scope), this.expr(e.r as Node, scope));
      case "log": {
        const l = this.expr(e.l as Node, scope);
        if (e.op === "&&") return l ? this.expr(e.r as Node, scope) : l;
        if (e.op === "||") return l ? l : this.expr(e.r as Node, scope);
        return l === null || l === undefined ? this.expr(e.r as Node, scope) : l;
      }
      case "cond": return this.truthy(this.expr(e.test as Node, scope)) ? this.expr(e.a as Node, scope) : this.expr(e.b as Node, scope);
      case "seq": {
        let last: unknown;
        for (const x of e.es as Node[]) last = this.expr(x, scope);
        return last;
      }
      case "assign": {
        const target = e.target as Node;
        let value: unknown;
        if (e.op === "=") value = this.expr(e.e as Node, scope);
        else {
          const current = this.expr(target, scope);
          const op = String(e.op).slice(0, -1);
          if (op === "&&" || op === "||" || op === "??") {
            const keep = op === "&&" ? !current : op === "||" ? Boolean(current) : current !== null && current !== undefined;
            if (keep) return current;
            value = this.expr(e.e as Node, scope);
          } else value = this.binary(op, current, this.expr(e.e as Node, scope));
        }
        this.assign(target, value, scope);
        return value;
      }
      case "upd": {
        const target = e.target as Node;
        const current = Number(this.expr(target, scope));
        const next = e.op === "++" ? current + 1 : current - 1;
        this.assign(target, next, scope);
        return e.prefix === true ? next : current;
      }
      case "fn": return new Closure(e.params as unknown[], e.body, e.arrow === true, scope);
      default:
        throw new Error("Unknown expression " + e.t + ".");
    }
  }
}

/**
 * Runs the program of a code node with its inputs. Returns what the code
 * returned, as JSON values; throws an Error whose message says what failed.
 */
export function runProgram(program: unknown, inputs: Record<string, unknown>, limits: RunLimits = DEFAULT_LIMITS): unknown {
  const p = program as { format?: unknown; body?: unknown };
  if (typeof p !== "object" || p === null || p.format !== 1 || !Array.isArray(p.body)) throw new Error("The code of this node is not compiled.");
  const machine = new Machine(limits, machineInputs(inputs));
  try {
    machine.block(p.body as Node[], new Scope(machine.globals));
  } catch (signal) {
    if (signal instanceof Return) return machine.toPlain(signal.value);
    if (signal instanceof Thrown) {
      const v = signal.value;
      throw new Error(isPlainObject(v) && typeof v.message === "string" ? v.message : "The code threw " + machine.toPlainText(v) + ".");
    }
    if (signal instanceof Break || signal instanceof Continue) throw new Error("break or continue outside of a loop.");
    if (signal instanceof RangeError) throw new Error("Too many nested calls.");
    throw signal;
  }
  return undefined;
}

/** The inputs, detached from the caller: JSON values only. */
function machineInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const text = JSON.stringify(inputs ?? {});
  const parsed = JSON.parse(text === undefined ? "{}" : text) as unknown;
  const clean = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clean);
    if (typeof v === "object" && v !== null) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v)) if (!FORBIDDEN.has(k)) Object.defineProperty(out, k, { value: clean((v as Record<string, unknown>)[k]), writable: true, enumerable: true, configurable: true });
      return out;
    }
    return v;
  };
  return clean(parsed) as Record<string, unknown>;
}
