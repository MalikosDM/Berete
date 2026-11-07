// Workflow runtime - written by the platform. Do not edit.
// It runs the workflow graphs of server/workflows/live/ (the last valid version
// of each server/workflows/<name>.workflow.ts) as routes of the site's API.
/** The parts of an Express request the runtime reads (an Express Request fits). */
export interface WorkflowRequest {
  body?: unknown;
  query: unknown;
  params: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
}

/** The parts of an Express response the runtime writes (an Express Response fits). */
export interface WorkflowResponse {
  status(code: number): { json(body: unknown): unknown; end(): unknown };
}

type WorkflowHandler = (req: WorkflowRequest, res: WorkflowResponse) => Promise<void>;

/** The parts of an Express Router the runtime mounts its routes on (an Express Router fits). */
export interface WorkflowRouter {
  get(path: string, handler: WorkflowHandler): unknown;
  post(path: string, handler: WorkflowHandler): unknown;
  put(path: string, handler: WorkflowHandler): unknown;
  patch(path: string, handler: WorkflowHandler): unknown;
  delete(path: string, handler: WorkflowHandler): unknown;
}

export interface WorkflowFieldRef {
  node: string;
  path: string;
}

export type WorkflowValue =
  | { type: "text"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "field"; node: string; path: string }
  | { type: "template"; parts: Array<string | WorkflowFieldRef> }
  | { type: "now" };

export interface WorkflowNode {
  id: string;
  kind: string;
  label?: string;
  position?: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  from: string;
  port: string;
  to: string;
}

export interface Workflow {
  format: number;
  name: string;
  label?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export type DbAction = "findFirst" | "findMany" | "create" | "updateMany" | "deleteMany" | "count";

/** What a workflow may do outside itself. server/workflows/index.ts provides them. */
export interface WorkflowEffects {
  db(model: string, action: DbAction, args: Record<string, unknown>): Promise<unknown>;
  notifyOwner(message: { subject: string; text: string; replyTo?: string }): Promise<void>;
  httpRequest(request: { method: string; url: string; body?: Record<string, unknown> }): Promise<{ status: number; body: unknown }>;
  wait(ms: number): Promise<void>;
  now(): Date;
  /** Runs the compiled program of a code node (server/workflows/interpreter.ts): no network, no files, no process. */
  runCode?(program: unknown, inputs: Record<string, unknown>): unknown;
  /** Calls an action of an application connected to the site (server/connectors/index.ts). */
  connector?(app: string, action: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface WorkflowInput {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export type WorkflowOutcome =
  | { kind: "responded"; status: number; body: unknown; trace: string[] }
  | { kind: "ended"; trace: string[] }
  | { kind: "failed"; node: string; message: string; trace: string[] };

const MAX_STEPS = 2000;
const MAX_LOOP_ITEMS = 1000;
const MAX_WAIT_SECONDS = 30;
const MIN_SCHEDULE_MINUTES = 5;

class NodeFailure extends Error {
  readonly node: string;
  constructor(node: string, message: string) {
    super(message);
    this.node = node;
  }
}

interface RunState {
  workflow: Workflow;
  nodes: Map<string, WorkflowNode>;
  outputs: Record<string, unknown>;
  effects: WorkflowEffects;
  trace: string[];
  steps: number;
  response: { status: number; body: unknown } | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function triggerOf(workflow: Workflow): WorkflowNode | undefined {
  return workflow.nodes.find((n) => n.kind.indexOf("trigger.") === 0);
}

function nextOf(workflow: Workflow, from: string, port: string): string | null {
  const edge = workflow.edges.find((e) => e.from === from && e.port === port);
  return edge === undefined ? null : edge.to;
}

function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)];
    else if (typeof current === "object") current = (current as Record<string, unknown>)[part];
    else return undefined;
  }
  return current;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function resolve(value: unknown, state: RunState): unknown {
  if (!isObject(value)) return undefined;
  switch (value.type) {
    case "text":
    case "number":
    case "boolean":
      return value.value;
    case "field":
      return readPath(state.outputs[String(value.node)], String(value.path));
    case "template": {
      const parts = Array.isArray(value.parts) ? value.parts : [];
      return parts.map((p) => (typeof p === "string" ? p : asText(readPath(state.outputs[String((p as WorkflowFieldRef).node)], String((p as WorkflowFieldRef).path))))).join("");
    }
    case "now":
      return state.effects.now().toISOString();
    default:
      return undefined;
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (a instanceof Date || b instanceof Date) return asText(a) === asText(b);
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

function order(a: unknown, b: unknown): number {
  const x = a instanceof Date ? a.getTime() : Number(a);
  const y = b instanceof Date ? b.getTime() : Number(b);
  if (Number.isFinite(x) && Number.isFinite(y) && asText(a) !== "" && asText(b) !== "") return x - y;
  return asText(a).localeCompare(asText(b));
}

function compare(left: unknown, operator: string, right: unknown): boolean {
  switch (operator) {
    case "equals": return sameValue(left, right);
    case "notEquals": return !sameValue(left, right);
    case "greaterThan": return order(left, right) > 0;
    case "lessThan": return order(left, right) < 0;
    case "greaterOrEqual": return order(left, right) >= 0;
    case "lessOrEqual": return order(left, right) <= 0;
    case "contains":
      return Array.isArray(left) ? left.some((x) => sameValue(x, right)) : asText(left).toLowerCase().indexOf(asText(right).toLowerCase()) !== -1;
    case "isEmpty": return isEmpty(left);
    case "isNotEmpty": return !isEmpty(left);
    case "isTrue": return left === true || left === "true";
    case "isFalse": return left === false || left === "false" || left === null || left === undefined;
    default: throw new Error("Unknown comparison \"" + operator + "\".");
  }
}

function list(config: unknown): Array<{ key: string; value: unknown }> {
  if (!Array.isArray(config)) return [];
  const out: Array<{ key: string; value: unknown }> = [];
  for (const item of config) {
    if (!isObject(item)) continue;
    const key = typeof item.field === "string" ? item.field : typeof item.name === "string" ? item.name : "";
    if (key !== "") out.push({ key: key, value: item.value });
  }
  return out;
}

function namedValues(config: unknown, state: RunState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const item of list(config)) {
    const value = resolve(item.value, state);
    if (value !== undefined) out[item.key] = value;
  }
  return out;
}

function whereOf(node: WorkflowNode, state: RunState, required: boolean): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const item of list(node.config.where)) {
    const value = resolve(item.value, state);
    if (value === undefined) throw new NodeFailure(node.id, "The criterion on \"" + item.key + "\" has no value.");
    where[item.key] = value;
  }
  if (required && Object.keys(where).length === 0) throw new NodeFailure(node.id, "This node needs at least one criterion.");
  return where;
}

/** The addresses a workflow may call: https, a domain name, no IP address, no port, no credentials. */
export function isAllowedAddress(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") return false;
  if (raw.indexOf("..") !== -1) return false;
  const host = url.hostname.toLowerCase();
  if (/^\d+(\.\d+)*$/.test(host) || host.indexOf(":") !== -1 || host === "localhost") return false;
  if (/\.(local|internal|localhost)$/.test(host)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host);
}

function shortMessage(error: unknown): string {
  const message = typeof error === "object" && error !== null ? (error as { message?: unknown }).message : undefined;
  const raw = typeof message === "string" ? message : String(error);
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const meaningful = lines.filter((l) => !/^Invalid .* invocation/.test(l) && !/^→/.test(l));
  return (meaningful[meaningful.length - 1] ?? lines[0] ?? "Unknown error").slice(0, 300);
}

async function effect<T>(node: WorkflowNode, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof NodeFailure) throw error;
    throw new NodeFailure(node.id, shortMessage(error));
  }
}

/** Runs one node; returns the output port to follow, or null when the path ends. */
async function step(node: WorkflowNode, state: RunState, inLoop: boolean): Promise<string | null> {
  const c = node.config;
  switch (node.kind) {
    case "logic.if":
      return compare(resolve(c.left, state), String(c.operator), resolve(c.right, state)) ? "true" : "false";
    case "logic.switch": {
      const value = resolve(c.value, state);
      const cases = Array.isArray(c.cases) ? c.cases : [];
      for (const item of cases) {
        if (isObject(item) && typeof item.id === "string" && sameValue(value, item.equals)) return item.id;
      }
      return "default";
    }
    case "logic.loop": {
      const items = resolve(c.list, state);
      if (!Array.isArray(items)) throw new NodeFailure(node.id, "The loop expects a list.");
      if (items.length > MAX_LOOP_ITEMS) throw new NodeFailure(node.id, "The loop has more than " + MAX_LOOP_ITEMS + " items.");
      const body = nextOf(state.workflow, node.id, "each");
      for (let index = 0; index < items.length; index++) {
        state.outputs[node.id] = { item: items[index], index: index };
        await walk(body, state, true);
      }
      state.outputs[node.id] = { item: null, index: items.length, count: items.length };
      return "done";
    }
    case "logic.wait": {
      const seconds = Math.min(MAX_WAIT_SECONDS, Math.max(0, Number(c.seconds) || 0));
      await effect(node, () => state.effects.wait(seconds * 1000));
      return "next";
    }
    case "logic.merge":
      return "next";
    case "data.find": {
      const model = String(c.model);
      const where = whereOf(node, state, false);
      const orderBy = isObject(c.orderBy) && typeof c.orderBy.field === "string"
        ? { [c.orderBy.field]: c.orderBy.direction === "desc" ? "desc" : "asc" } : undefined;
      if (c.mode === "many") {
        const take = Math.min(100, Math.max(1, Number(c.limit) || 20));
        const records = await effect(node, () => state.effects.db(model, "findMany", orderBy === undefined ? { where: where, take: take } : { where: where, orderBy: orderBy, take: take }));
        const rows = Array.isArray(records) ? records : [];
        state.outputs[node.id] = { records: rows, record: rows[0] ?? null, count: rows.length };
        return rows.length > 0 ? "found" : "empty";
      }
      const record = await effect(node, () => state.effects.db(model, "findFirst", orderBy === undefined ? { where: where } : { where: where, orderBy: orderBy }));
      state.outputs[node.id] = { record: record ?? null, records: record ? [record] : [], count: record ? 1 : 0 };
      return record ? "found" : "empty";
    }
    case "data.create": {
      const model = String(c.model);
      const data = namedValues(c.values, state);
      const record = await effect(node, () => state.effects.db(model, "create", { data: data }));
      state.outputs[node.id] = { record: record };
      return "next";
    }
    case "data.update": {
      const model = String(c.model);
      const where = whereOf(node, state, true);
      const data = namedValues(c.values, state);
      const result = await effect(node, () => state.effects.db(model, "updateMany", { where: where, data: data }));
      state.outputs[node.id] = { count: isObject(result) ? Number(result.count) || 0 : 0 };
      return "next";
    }
    case "data.delete": {
      const model = String(c.model);
      const where = whereOf(node, state, true);
      const result = await effect(node, () => state.effects.db(model, "deleteMany", { where: where }));
      state.outputs[node.id] = { count: isObject(result) ? Number(result.count) || 0 : 0 };
      return "next";
    }
    case "data.variable":
      state.outputs[node.id] = { value: resolve(c.value, state) };
      return "next";
    case "data.transform":
      state.outputs[node.id] = namedValues(c.fields, state);
      return "next";
    case "action.notifyOwner": {
      const subject = asText(resolve(c.subject, state)).slice(0, 200);
      const text = asText(resolve(c.message, state)).slice(0, 5000);
      const replyTo = c.replyTo === undefined || c.replyTo === null ? "" : asText(resolve(c.replyTo, state));
      if (subject.trim() === "" || text.trim() === "") throw new NodeFailure(node.id, "The email has an empty subject or message.");
      await effect(node, () => state.effects.notifyOwner(replyTo === "" ? { subject: subject, text: text } : { subject: subject, text: text, replyTo: replyTo }));
      return "next";
    }
    case "action.respond": {
      if (inLoop) throw new NodeFailure(node.id, "Cannot answer from inside a loop.");
      const status = Number(c.status);
      if (!Number.isInteger(status) || status < 200 || status > 599) throw new NodeFailure(node.id, "The response status must be between 200 and 599.");
      state.response = { status: status, body: namedValues(c.fields, state) };
      return null;
    }
    case "app.action": {
      const app = String(c.app);
      const connector = state.effects.connector;
      if (connector === undefined) throw new NodeFailure(node.id, "The application " + app + " is not connected to this site.");
      const input = namedValues(c.inputs, state);
      const result = await effect(node, () => connector(app, String(c.action), input));
      state.outputs[node.id] = isObject(result) ? result : { result: result };
      return "next";
    }
    case "code.typescript": {
      const runCode = state.effects.runCode;
      if (runCode === undefined) throw new NodeFailure(node.id, "Code nodes cannot run here.");
      if (!isObject(c.program)) throw new NodeFailure(node.id, "The code of this node is not compiled yet: save the workflow again.");
      const inputs = namedValues(c.inputs, state);
      const result = await effect(node, async () => runCode(c.program, inputs));
      if (!isObject(result)) throw new NodeFailure(node.id, "The code must return an object.");
      state.outputs[node.id] = result;
      return "next";
    }
    case "action.httpRequest": {
      const url = String(c.url);
      if (!isAllowedAddress(url)) throw new NodeFailure(node.id, "The address " + url + " is not allowed.");
      const method = String(c.method || "POST").toUpperCase();
      const body = namedValues(c.fields, state);
      const answer = await effect(node, () => state.effects.httpRequest(method === "GET" || method === "DELETE" ? { method: method, url: url } : { method: method, url: url, body: body }));
      state.outputs[node.id] = { status: answer.status, body: answer.body };
      if (answer.status < 200 || answer.status >= 300) throw new NodeFailure(node.id, "The address answered " + answer.status + ".");
      return "next";
    }
    default:
      throw new NodeFailure(node.id, "The node kind \"" + node.kind + "\" cannot run here.");
  }
}

async function walk(start: string | null, state: RunState, inLoop: boolean): Promise<void> {
  let current = start;
  while (current !== null) {
    if (state.response !== null) return;
    const node = state.nodes.get(current);
    if (node === undefined) throw new NodeFailure(current, "The node \"" + current + "\" does not exist.");
    state.steps += 1;
    if (state.steps > MAX_STEPS) throw new NodeFailure(node.id, "The workflow ran more than " + MAX_STEPS + " steps.");
    state.trace.push(node.id);
    const port = await step(node, state, inLoop);
    if (port === null) return;
    current = nextOf(state.workflow, node.id, port);
  }
}

function triggerOutput(trigger: WorkflowNode, input: WorkflowInput, effects: WorkflowEffects): unknown {
  if (trigger.kind === "trigger.schedule") return { firedAt: effects.now().toISOString() };
  if (trigger.kind === "trigger.shopEvent") return { data: input.data ?? {} };
  if (trigger.kind === "trigger.app") return input.data ?? {};
  return { body: input.body ?? {}, query: input.query ?? {}, params: input.params ?? {} };
}

/** Runs a workflow once. Never throws: a failure names the node that failed. */
export async function runWorkflow(workflow: Workflow, input: WorkflowInput, effects: WorkflowEffects): Promise<WorkflowOutcome> {
  const state: RunState = {
    workflow: workflow,
    nodes: new Map(workflow.nodes.map((n) => [n.id, n] as [string, WorkflowNode])),
    outputs: {},
    effects: effects,
    trace: [],
    steps: 0,
    response: null,
  };
  const trigger = triggerOf(workflow);
  if (trigger === undefined) return { kind: "failed", node: "", message: "The workflow has no trigger.", trace: state.trace };
  state.outputs[trigger.id] = triggerOutput(trigger, input, effects);
  state.trace.push(trigger.id);
  try {
    await walk(nextOf(workflow, trigger.id, "next"), state, false);
  } catch (error) {
    const failure = error instanceof NodeFailure ? error : new NodeFailure("", shortMessage(error));
    const handler = workflow.nodes.find((n) => n.kind === "error.catch");
    if (handler === undefined || state.response !== null) {
      return { kind: "failed", node: failure.node, message: failure.message, trace: state.trace };
    }
    state.outputs[handler.id] = { message: failure.message, node: failure.node };
    state.trace.push(handler.id);
    try {
      await walk(nextOf(workflow, handler.id, "next"), state, false);
    } catch (again) {
      const second = again instanceof NodeFailure ? again : new NodeFailure(handler.id, shortMessage(again));
      return { kind: "failed", node: second.node, message: second.message, trace: state.trace };
    }
  }
  if (state.response !== null) return { kind: "responded", status: state.response.status, body: state.response.body, trace: state.trace };
  return { kind: "ended", trace: state.trace };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads the declared fields of a form or API trigger from the request; anything else is dropped. */
export function readFields(fields: unknown, source: Record<string, unknown>): { values: Record<string, unknown> } | { error: string } {
  const values: Record<string, unknown> = {};
  if (!Array.isArray(fields)) return { values: values };
  for (const field of fields) {
    if (!isObject(field) || typeof field.name !== "string") continue;
    const raw = source[field.name];
    if (raw === undefined || raw === null || raw === "") {
      if (field.required === true) return { error: "Missing field: " + field.name + "." };
      continue;
    }
    if (field.type === "number") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return { error: "The field " + field.name + " must be a number." };
      values[field.name] = n;
    } else if (field.type === "boolean") {
      values[field.name] = raw === true || raw === "true" || raw === "on" || raw === "1";
    } else if (field.type === "email") {
      const text = String(raw).trim().toLowerCase().slice(0, 320);
      if (!EMAIL.test(text)) return { error: "The field " + field.name + " must be an email address." };
      values[field.name] = text;
    } else {
      values[field.name] = String(raw).slice(0, 5000);
    }
  }
  return { values: values };
}

function sendOutcome(workflow: Workflow, outcome: WorkflowOutcome, res: WorkflowResponse): void {
  if (outcome.kind === "responded") {
    res.status(outcome.status).json(outcome.body);
  } else if (outcome.kind === "ended") {
    res.status(204).end();
  } else {
    console.error("[workflow " + workflow.name + "] node " + outcome.node + ": " + outcome.message);
    res.status(500).json({ error: "Something went wrong." });
  }
}

const SHOP_EVENTS: Record<string, string> = { "order.paid": "commande.payee" };

/** The order fields a shop event carries, under English names. */
function shopEventData(payload: unknown): Record<string, unknown> {
  const data = isObject(payload) && isObject(payload.donnees) ? payload.donnees : {};
  return { orderId: data.commandeId, email: data.courriel, name: data.nom, paidAt: data.payeeLe };
}

export interface MountOptions {
  /** Checks the signature of a shop event (server/workflows/index.ts). */
  verifyShopEvent?: (req: WorkflowRequest) => boolean;
}

/** Mounts the form and API workflows on the router, and the shop events on POST /shop-events. */
export function mountWorkflows(router: WorkflowRouter, workflows: Workflow[], effects: WorkflowEffects, options: MountOptions = {}): void {
  for (const workflow of workflows) {
    const trigger = triggerOf(workflow);
    if (trigger === undefined || (trigger.kind !== "trigger.form" && trigger.kind !== "trigger.api")) continue;
    const method = trigger.kind === "trigger.form" ? "POST" : String(trigger.config.method || "GET").toUpperCase();
    const path = String(trigger.config.path || "");
    if (path === "") continue;
    const handler = async (req: WorkflowRequest, res: WorkflowResponse): Promise<void> => {
      const source = method === "GET" || method === "DELETE" ? (isObject(req.query) ? req.query : {}) : (isObject(req.body) ? req.body : {});
      const read = readFields(trigger.config.fields, source);
      if ("error" in read) {
        res.status(400).json({ error: read.error });
        return;
      }
      const input: WorkflowInput = method === "GET" || method === "DELETE"
        ? { query: read.values, params: req.params }
        : { body: read.values, query: isObject(req.query) ? req.query : {}, params: req.params };
      sendOutcome(workflow, await runWorkflow(workflow, input, effects), res);
    };
    if (method === "GET") router.get(path, handler);
    else if (method === "POST") router.post(path, handler);
    else if (method === "PUT") router.put(path, handler);
    else if (method === "PATCH") router.patch(path, handler);
    else if (method === "DELETE") router.delete(path, handler);
  }

  const shop = workflows.filter((w) => triggerOf(w)?.kind === "trigger.shopEvent");
  if (shop.length === 0) return;
  router.post("/shop-events", async (req: WorkflowRequest, res: WorkflowResponse) => {
    if (options.verifyShopEvent === undefined || !options.verifyShopEvent(req)) {
      res.status(401).json({ error: "Unsigned event." });
      return;
    }
    const event = isObject(req.body) ? String(req.body.evenement || "") : "";
    const data = shopEventData(req.body);
    for (const workflow of shop) {
      const wanted = SHOP_EVENTS[String(triggerOf(workflow)?.config.event || "")];
      if (wanted !== event) continue;
      const outcome = await runWorkflow(workflow, { data: data }, effects);
      if (outcome.kind === "failed") console.error("[workflow " + workflow.name + "] node " + outcome.node + ": " + outcome.message);
    }
    res.status(200).json({ ok: true });
  });
}

/** The static values of the inputs of an application trigger (what a poll asks for). */
function staticInputs(config: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const item of list(config)) {
    if (isObject(item.value) && (item.value.type === "text" || item.value.type === "number" || item.value.type === "boolean")) out[item.key] = item.value.value;
  }
  return out;
}

/** The polls the application triggers need: one per workflow, with its inputs. */
export function appTriggerWatches(workflows: Workflow[]): Array<{ app: string; trigger: string; input: Record<string, unknown> }> {
  const out: Array<{ app: string; trigger: string; input: Record<string, unknown> }> = [];
  for (const workflow of workflows) {
    const trigger = triggerOf(workflow);
    if (trigger === undefined || trigger.kind !== "trigger.app") continue;
    out.push({ app: String(trigger.config.app), trigger: String(trigger.config.trigger), input: staticInputs(trigger.config.inputs) });
  }
  return out;
}

/** Runs the workflows started by an event of a connected application (a webhook, or a poll with its inputs). */
export async function runAppTrigger(workflows: Workflow[], app: string, trigger: string, event: Record<string, unknown>, effects: WorkflowEffects, input?: Record<string, unknown>): Promise<void> {
  for (const workflow of workflows) {
    const start = triggerOf(workflow);
    if (start === undefined || start.kind !== "trigger.app" || start.config.app !== app || start.config.trigger !== trigger) continue;
    if (input !== undefined && JSON.stringify(staticInputs(start.config.inputs)) !== JSON.stringify(input)) continue;
    const outcome = await runWorkflow(workflow, { data: event }, effects);
    if (outcome.kind === "failed") console.error("[workflow " + workflow.name + "] node " + outcome.node + ": " + outcome.message);
  }
}

/** Starts the scheduled workflows. Returns a function that stops them. */
export function startSchedules(workflows: Workflow[], effects: WorkflowEffects): () => void {
  const timers: Array<ReturnType<typeof setInterval>> = [];
  const units: Record<string, number> = { minutes: 60000, hours: 3600000, days: 86400000 };
  for (const workflow of workflows) {
    const trigger = triggerOf(workflow);
    if (trigger === undefined || trigger.kind !== "trigger.schedule") continue;
    const every = Math.max(1, Math.floor(Number(trigger.config.every) || 1));
    const ms = Math.max(MIN_SCHEDULE_MINUTES * 60000, every * (units[String(trigger.config.unit)] ?? 86400000));
    let running = false;
    timers.push(setInterval(() => {
      if (running) return;
      running = true;
      runWorkflow(workflow, {}, effects)
        .then((outcome) => {
          if (outcome.kind === "failed") console.error("[workflow " + workflow.name + "] node " + outcome.node + ": " + outcome.message);
        })
        .finally(() => {
          running = false;
        });
    }, ms));
  }
  return () => {
    for (const t of timers) clearInterval(t);
  };
}
