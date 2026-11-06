#!/usr/bin/env bun
/**
 * 本地 dev 环境初始化：写入模型供应商、示例工作区和多租户测试账号。
 *
 * 只面向本地开发。由 scripts/dev.sh 调用；所有密钥从 env 文件读取，
 * 不写入源码、不打印到终端。
 */

import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createMultiTenant } from "../packages/multiTenant/auth/index.ts";
import { createBilling } from "../packages/multiTenant/billing/index.ts";
import { createModelRouting } from "../packages/multiTenant/models/index.ts";
import type { ModelPrice, ModelProvider, ModelRoute } from "../packages/multiTenant/models/config.ts";
import { parse } from "../node_modules/.bun/@babel+parser@7.29.8/node_modules/@babel/parser/lib/index.js";

const ROOT = resolve(import.meta.dir, "..");
const DATA_DIR = resolve(ROOT, process.env.TOONFLOW_DEV_DATA_DIR?.trim() || ".local/dev-data");
const SETTINGS_PATH = resolve(DATA_DIR, "settings.json");

type SettingsFile = { settings?: Record<string, unknown>; [key: string]: unknown };
type ProviderModel = { id: string; label: string; contextWindow?: number; maxOutputTokens?: number };
type CustomProvider = {
  id: string;
  label: string;
  apiUrl: string;
  apiKey: string;
  protocol: "openai-completions" | "openai-responses" | "anthropic-messages";
  models: ProviderModel[];
};
type MediaRouteSpec = {
  id: string;
  label: string;
  type: "image" | "video" | "audio";
  price: string;
};

const mediaProviderIds: Record<string, string> = { apimart: "apiMart", metaso: "metaso", compshare: "compshare" };

function fail(message: string): never {
  throw new Error(message);
}

function unwrap(expression: any): any {
  while (expression && ["TSAsExpression", "TSSatisfiesExpression", "ParenthesizedExpression", "TSTypeAssertion"].includes(expression.type)) {
    expression = expression.expression;
  }
  return expression;
}

function literal(value: any): unknown {
  value = unwrap(value);
  if (!value) return undefined;
  if (["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(value.type)) return value.value;
  if (value.type === "NullLiteral") return null;
  if (value.type === "TemplateLiteral" && !value.expressions.length) return value.quasis[0]?.value.cooked ?? "";
  if (value.type === "UnaryExpression" && ["-", "+"].includes(value.operator) && value.argument.type === "NumericLiteral") {
    return value.operator === "-" ? -value.argument.value : value.argument.value;
  }
  if (value.type === "ArrayExpression") return value.elements.map(item => literal(item));
  if (value.type === "ObjectExpression") {
    return Object.fromEntries(value.properties.filter((property: any) => property.type === "ObjectProperty" && !property.computed)
      .map((property: any) => {
        const name = property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" ? property.key.value : undefined;
        return [name, literal(property.value)];
      }));
  }
  return undefined;
}

function readMediaProviderMetadata(source: string) {
  const exported = parse(source, { sourceType: "module", plugins: ["typescript"] }).program.body
    .find((item: any) => item.type === "ExportDefaultDeclaration");
  if (!exported) fail("媒体供应商源码缺少默认导出");
  const object = unwrap(exported.declaration);
  if (!object || object.type !== "ObjectExpression") fail("媒体供应商源码默认导出格式无效");
  const entries = new Map<string, any>();
  for (const property of object.properties) {
    if (property.type !== "ObjectProperty" || property.computed) continue;
    const name = property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" ? property.key.value : undefined;
    if (name) entries.set(name, property);
  }
  const models = literal(entries.get("models")?.value);
  if (!Array.isArray(models)) fail("媒体供应商源码缺少模型列表");
  return { id: literal(entries.get("id")?.value), label: literal(entries.get("label")?.value), models };
}

function optional(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function integer(name: string, fallback: number) {
  const raw = optional(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) fail(`${name} 必须是正整数`);
  return value;
}

function amount(name: string, fallback: string) {
  const raw = optional(name) ?? fallback;
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/.test(raw)) fail(`${name} 不是有效的金额`);
  return raw;
}

function parseMediaRoutes(raw: string | undefined): MediaRouteSpec[] {
  if (!raw?.trim()) return [];
  const routes = raw.split(",").map(item => item.trim()).filter(Boolean).map(item => {
    const fields = item.split(":").map(value => value.trim());
    if (fields.length < 2) fail("TOONFLOW_DEV_MEDIA_ROUTES 格式应为 模型ID:展示名[:类型[:价格]]");
    const [id, label, type, price] = fields;
    if (!id || !label) fail("TOONFLOW_DEV_MEDIA_ROUTES 包含无效条目");
    if (!["image", "video", "audio"].includes(type ?? "image")) fail("TOONFLOW_DEV_MEDIA_ROUTES 的类型只能是 image、video 或 audio");
    const value = price ?? "0";
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/.test(value)) fail("TOONFLOW_DEV_MEDIA_ROUTES 的价格无效");
    return { id, label, type: (type ?? "image") as MediaRouteSpec["type"], price: value };
  });
  if (routes.length !== new Set(routes.map(route => route.id)).size) fail("TOONFLOW_DEV_MEDIA_ROUTES 的模型 ID 不能重复");
  return routes;
}

function textPrice(name: string, fallback: string): ModelPrice {
  return {
    mode: "perMillionTokens",
    currency: "CNY",
    input: amount(`${name}_INPUT`, fallback),
    output: amount(`${name}_OUTPUT`, fallback),
    cacheRead: amount(`${name}_CACHE_READ`, "0"),
    cacheWrite: amount(`${name}_CACHE_WRITE`, "0"),
  };
}

function mediaPrice(route: MediaRouteSpec): ModelPrice {
  return route.type === "video"
    ? { mode: "perSecond", currency: "CNY", amount: route.price }
    : { mode: "perRequest", currency: "CNY", amount: route.price };
}

async function seedModelRouting(textProvider: CustomProvider | undefined, mediaProvider: ModelProvider | undefined, mediaRoutes: MediaRouteSpec[]) {
  if (!textProvider && !mediaProvider) return { providers: 0, routes: 0 };
  const routing = createModelRouting(DATA_DIR);
  const snapshot = await routing.read();
  const providers: ModelProvider[] = [];
  if (textProvider) {
    providers.push({
      kind: "text",
      id: textProvider.id,
      label: textProvider.label,
      config: {
        apiUrl: textProvider.apiUrl,
        apiKey: textProvider.apiKey,
        protocol: textProvider.protocol,
        models: textProvider.models,
      },
    });
  }
  if (mediaProvider) providers.push(mediaProvider);

  const routes: ModelRoute[] = [];
  if (textProvider) {
    for (const model of textProvider.models) {
      routes.push({
        id: randomUUID(),
        publicId: `${textProvider.id}-${model.id}`,
        label: `${textProvider.label} ${model.label}`,
        type: "text",
        enabled: true,
        target: "backend",
        providerId: textProvider.id,
        upstreamModelId: model.id,
        salePrice: textPrice("TOONFLOW_DEV_TEXT_PRICE", "0.001"),
        costPrice: null,
      });
    }
  }
  if (mediaProvider) {
    const metadata = readMediaProviderMetadata(mediaProvider.source!);
    for (const route of mediaRoutes) {
      const model = metadata.models.find(item => item.id === route.id);
      if (!model || model.type !== route.type) fail(`媒体供应商 ${mediaProvider.id} 中不存在 ${route.id}（${route.type}）`);
      routes.push({
        id: randomUUID(),
        publicId: `${mediaProvider.id}-${route.id}`,
        label: `${mediaProvider.label} ${route.label}`,
        type: route.type,
        enabled: true,
        target: "backend",
        providerId: mediaProvider.id,
        upstreamModelId: route.id,
        salePrice: mediaPrice(route),
        costPrice: null,
      });
    }
  }

  if (!snapshot.revision) {
    await routing.saveProviders({ providers }, 0);
    await routing.save(routes, 1);
  } else {
    // 已有多租户配置时，用本次 env 中的供应商覆盖同 kind+id 的旧配置，其余供应商保持不变。
    const previous = await routing.read();
    const previousProvidersRaw = await routing.readProviders();
    const previousProviders = previousProvidersRaw?.providers ?? [];
    const mergedProviders = [
      ...previousProviders.filter(item => !providers.some(provider => provider.kind === item.kind && provider.id === item.id)),
      ...providers,
    ];
    const revision = previous.revision;
    const currentRoutes = previous.routes;
    let routesRevision = revision;
    if (JSON.stringify(mergedProviders) !== JSON.stringify(previousProviders)) {
      await routing.saveProviders({ providers: mergedProviders }, revision);
      routesRevision = revision + 1;
    }
    const mergedRoutes = [...currentRoutes];
    for (const route of routes) {
      const index = mergedRoutes.findIndex(item => item.providerId === route.providerId && item.upstreamModelId === route.upstreamModelId && item.type === route.type);
      if (index < 0) mergedRoutes.push(route);
      else mergedRoutes[index] = { ...route, id: mergedRoutes[index]!.id };
    }
    if (JSON.stringify(mergedRoutes) !== JSON.stringify(currentRoutes)) await routing.save(mergedRoutes, routesRevision);
  }
  return { providers: providers.length, routes: routes.length };
}

function enabled(name: string, fallback = false) {
  const raw = optional(name);
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(raw.toLowerCase())) return false;
  fail(`${name} 只能填写 1/0、true/false、yes/no 或 on/off`);
}

function readSettings(): SettingsFile {
  if (!existsSync(SETTINGS_PATH)) return { settings: {} };
  try {
    const value = JSON.parse(readFileSync(SETTINGS_PATH, "utf8")) as SettingsFile;
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("settings.json 格式无效");
    if (value.settings !== undefined && (!value.settings || typeof value.settings !== "object" || Array.isArray(value.settings))) fail("settings.json 的 settings 字段格式无效");
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) fail("settings.json 不是有效 JSON，请先修复或删除该文件");
    throw error;
  }
}

function writeSettings(value: SettingsFile) {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true, mode: 0o700 });
  const temporary = `${SETTINGS_PATH}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, SETTINGS_PATH);
}

function parseModels(raw: string | undefined): ProviderModel[] {
  if (!raw?.trim()) fail("已配置语言模型供应商，但 TOONFLOW_DEV_TEXT_MODELS 为空");
  const models = raw.split(",").map(item => item.trim()).filter(Boolean).map(item => {
    const separator = item.indexOf(":");
    const id = (separator < 0 ? item : item.slice(0, separator)).trim();
    const label = (separator < 0 ? item : item.slice(separator + 1)).trim() || id;
    if (!id) fail("TOONFLOW_DEV_TEXT_MODELS 包含空模型 ID");
    return { id, label };
  });
  if (!models.length) fail("TOONFLOW_DEV_TEXT_MODELS 至少要有一个模型");
  if (models.length !== new Set(models.map(model => model.id)).size) fail("TOONFLOW_DEV_TEXT_MODELS 的模型 ID 不能重复");
  return models;
}

function buildTextProvider(): CustomProvider | undefined {
  const apiKey = optional("TOONFLOW_DEV_TEXT_API_KEY");
  const apiUrl = optional("TOONFLOW_DEV_TEXT_API_URL");
  if (!apiKey && !apiUrl) return undefined;
  if (!apiKey || !apiUrl) fail("语言模型必须同时填写 TOONFLOW_DEV_TEXT_API_KEY 和 TOONFLOW_DEV_TEXT_API_URL");
  if (/replace|change.?me|your[-_ ]?key/i.test(apiKey)) fail("TOONFLOW_DEV_TEXT_API_KEY 仍是示例占位值，请填写真实密钥");
  let url: URL;
  try { url = new URL(apiUrl); }
  catch { fail("TOONFLOW_DEV_TEXT_API_URL 不是有效 URL"); }
  if (!["http:", "https:"].includes(url.protocol)) fail("TOONFLOW_DEV_TEXT_API_URL 必须是 HTTP(S) 地址");
  const protocol = optional("TOONFLOW_DEV_TEXT_PROTOCOL") || "openai-completions";
  if (!["openai-completions", "openai-responses", "anthropic-messages"].includes(protocol)) {
    fail("TOONFLOW_DEV_TEXT_PROTOCOL 只能是 openai-completions、openai-responses 或 anthropic-messages");
  }
  const id = optional("TOONFLOW_DEV_TEXT_PROVIDER_ID") || "deepseek";
  if (!/^[A-Za-z0-9._-]+$/.test(id) || id.toLowerCase() === "toonflow") fail("TOONFLOW_DEV_TEXT_PROVIDER_ID 无效（不能使用 toonflow）");
  const contextWindow = optional("TOONFLOW_DEV_TEXT_CONTEXT_WINDOW");
  const maxOutputTokens = optional("TOONFLOW_DEV_TEXT_MAX_OUTPUT_TOKENS");
  return {
    id,
    label: optional("TOONFLOW_DEV_TEXT_PROVIDER_LABEL") || id,
    apiUrl,
    apiKey,
    protocol: protocol as CustomProvider["protocol"],
    models: parseModels(optional("TOONFLOW_DEV_TEXT_MODELS") || "deepseek-chat:DeepSeek Chat").map(model => ({
      ...model,
      ...(contextWindow ? { contextWindow: integer("TOONFLOW_DEV_TEXT_CONTEXT_WINDOW", 1) } : {}),
      ...(maxOutputTokens ? { maxOutputTokens: integer("TOONFLOW_DEV_TEXT_MAX_OUTPUT_TOKENS", 1) } : {}),
    })),
  };
}

function buildMediaConfigs(): Record<string, Record<string, unknown>> | undefined {
  const provider = optional("TOONFLOW_DEV_MEDIA_PROVIDER");
  if (!provider || provider.toLowerCase() === "none") return undefined;
  let config: Record<string, unknown>;
  const id = mediaProviderIds[provider.toLowerCase()] ?? provider.toLowerCase();
  if (id === "apiMart") {
    const apiKey = optional("TOONFLOW_DEV_MEDIA_API_KEY");
    if (!apiKey) fail("TOONFLOW_DEV_MEDIA_PROVIDER=apiMart 时必须填写 TOONFLOW_DEV_MEDIA_API_KEY");
    config = { apiKey, isOverseas: optional("TOONFLOW_DEV_MEDIA_IS_OVERSEAS") || "1" };
  } else if (id === "metaso") {
    const apiKey = optional("TOONFLOW_DEV_MEDIA_API_KEY");
    if (!apiKey) fail("TOONFLOW_DEV_MEDIA_PROVIDER=metaso 时必须填写 TOONFLOW_DEV_MEDIA_API_KEY");
    config = { apiKey, baseUrl: optional("TOONFLOW_DEV_MEDIA_BASE_URL") || "https://metaso.cn/api/minimax" };
  } else if (id === "compshare") {
    const apiKey = optional("TOONFLOW_DEV_MEDIA_API_KEY");
    if (!apiKey) fail("TOONFLOW_DEV_MEDIA_PROVIDER=compshare 时必须填写 TOONFLOW_DEV_MEDIA_API_KEY");
    config = { apiKey, minimaxApiKey: optional("TOONFLOW_DEV_MEDIA_MINIMAX_API_KEY") || "" };
  } else {
    fail("TOONFLOW_DEV_MEDIA_PROVIDER 目前只支持 apiMart、metaso、compshare 或 none");
  }
  const override = optional("TOONFLOW_DEV_MEDIA_CONFIG_JSON");
  if (override) {
    let parsed: unknown;
    try { parsed = JSON.parse(override); }
    catch { fail("TOONFLOW_DEV_MEDIA_CONFIG_JSON 不是有效 JSON"); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("TOONFLOW_DEV_MEDIA_CONFIG_JSON 必须是 JSON 对象");
    config = { ...config, ...parsed };
  }
  return { [id]: config };
}

function buildMediaProvider(): ModelProvider | undefined {
  const id = optional("TOONFLOW_DEV_MEDIA_PROVIDER")?.toLowerCase();
  if (!id || id === "none") return undefined;
  const providerId = mediaProviderIds[id] ?? id;
  const source = readFileSync(resolve(ROOT, "packages/providers/src/media", `${providerId}.ts`), "utf8");
  const metadata = readMediaProviderMetadata(source);
  if (metadata.id !== providerId) fail(`媒体供应商 ID 与文件名不一致：${metadata.id}`);
  const config = buildMediaConfigs()?.[metadata.id];
  if (!config) fail(`媒体供应商 ${metadata.id} 缺少配置`);
  return { kind: "media", id: metadata.id, label: metadata.label, source, config };
}

function seedProject(settings: Record<string, unknown>) {
  const name = optional("TOONFLOW_DEV_PROJECT_NAME") || "Toonflow Dev";
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(name) || name === "." || name === "..") fail("TOONFLOW_DEV_PROJECT_NAME 包含无效字符");
  const directory = resolve(DATA_DIR, "workspaces", name);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const canvas = resolve(directory, "画布1.json");
  if (!existsSync(canvas)) {
    writeFileSync(canvas, `${JSON.stringify({ toonflowCanvas: true, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }, null, 2)}\n`, { mode: 0o600 });
  }
  const now = Date.now();
  const stores = settings.stores && typeof settings.stores === "object" && !Array.isArray(settings.stores)
    ? settings.stores as Record<string, unknown> : {};
  const persisted = stores["toonflow.projectList"] && typeof stores["toonflow.projectList"] === "object" && !Array.isArray(stores["toonflow.projectList"])
    ? stores["toonflow.projectList"] as Record<string, unknown> : {};
  const previous = Array.isArray(persisted.projectList) ? persisted.projectList : [];
  const existing = previous.find(item => item && typeof item === "object" && (item as Record<string, unknown>).directory === directory) as Record<string, unknown> | undefined;
  const project = { directory, name, lastOpenedAt: now };
  stores["toonflow.projectList"] = {
    project: persisted.project && typeof persisted.project === "object" ? persisted.project : project,
    projectList: [project, ...previous.filter(item => item !== existing && (!item || typeof item !== "object" || (item as Record<string, unknown>).directory !== directory))],
  };
  settings.stores = stores;
  return { directory, name };
}

async function seedAccounts() {
  const auth = createMultiTenant(DATA_DIR);
  const adminUser = optional("TOONFLOW_DEV_ADMIN_USER") || "admin";
  const adminPassword = optional("TOONFLOW_DEV_ADMIN_PASSWORD") || "admin123456";
  const userName = optional("TOONFLOW_DEV_USER") || "test";
  const userPassword = optional("TOONFLOW_DEV_USER_PASSWORD") || "test123456";
  if (!await auth.isConfigured()) await auth.setup(adminUser, adminPassword);
  let user: { id: string; userName: string } | undefined;
  try { user = await auth.createUser(userName, userPassword); }
  catch (error) {
    if ((error as { status?: number }).status !== 409) throw error;
    const users = await auth.listUsers({ search: userName, page: 1, pageSize: 1, status: "all" });
    user = users.items.find(item => item.userName.toLowerCase() === userName.toLowerCase());
  }
  if (!user) fail("无法创建或查找普通测试账号");
  const directory = resolve(DATA_DIR, "multiTenant", "workspaces", user.id);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return { adminUser, userName: user.userName, userId: user.id, directory };
}

async function seedUserBalance(userId: string) {
  const value = amount("TOONFLOW_DEV_USER_BALANCE", "100");
  const billing = createBilling(DATA_DIR);
  const current = await billing.read(userId);
  const existing = Number(current.wallets.find(wallet => wallet.currency === "CNY")?.balance ?? "0");
  if (existing < Number(value)) {
    await billing.credit({ userId, currency: "CNY", amount: String(Number(value) - existing), requestId: randomUUID(), note: "本地 dev 测试余额" });
  }
  return value;
}

async function main() {
  const file = readSettings();
  const settings = file.settings ?? {};
  const providers = Array.isArray(settings.customProviders)
    ? settings.customProviders.filter(item => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[]
    : [];
  const textProvider = buildTextProvider();
  if (textProvider) {
    const index = providers.findIndex(item => item.id === textProvider.id);
    if (index >= 0) providers[index] = textProvider;
    else providers.push(textProvider);
    settings.customProviders = providers;
  }
  const mediaConfigs = buildMediaConfigs();
  if (mediaConfigs) {
    const current = settings.mediaProviderConfigs && typeof settings.mediaProviderConfigs === "object" && !Array.isArray(settings.mediaProviderConfigs)
      ? settings.mediaProviderConfigs as Record<string, unknown> : {};
    settings.mediaProviderConfigs = Object.fromEntries(Object.entries({ ...current, ...mediaConfigs }).map(([id, config]) => [
      id,
      config && typeof config === "object" && !Array.isArray(config) && current[id] && typeof current[id] === "object" && !Array.isArray(current[id])
        ? { ...(current[id] as Record<string, unknown>), ...(config as Record<string, unknown>) }
        : config,
    ]));
  }
  if (!textProvider && !mediaConfigs) fail("没有可 seed 的模型：请至少配置语言模型或媒体模型");
  settings.helloCompleted = true;
  settings.multiTenantEnabled = enabled("TOONFLOW_DEV_MULTITENANT");
  const accounts = await seedAccounts();
  const mediaProvider = buildMediaProvider();
  const mediaRoutes = parseMediaRoutes(optional("TOONFLOW_DEV_MEDIA_ROUTES") || "seedance-2.5:Seedance 2.5:video:0.001");
  const routed = await seedModelRouting(textProvider, mediaProvider, mediaRoutes);
  const balance = mediaProvider || textProvider ? await seedUserBalance(accounts.userId) : undefined;
  const project = seedProject(settings);
  const auth = createMultiTenant(DATA_DIR);
  const saved = await auth.readUserSettings(accounts.userId);
  const userSettings = { ...saved.settings, helloCompleted: true };
  const stores = userSettings.stores && typeof userSettings.stores === "object" && !Array.isArray(userSettings.stores)
    ? userSettings.stores as Record<string, unknown> : {};
  const canvas = resolve(accounts.directory, "画布1.json");
  if (!existsSync(canvas)) {
    writeFileSync(canvas, `${JSON.stringify({ toonflowCanvas: true, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }, null, 2)}\n`, { mode: 0o600 });
  }
  mkdirSync(resolve(accounts.directory, "assets"), { recursive: true, mode: 0o700 });
  const persisted = stores["toonflow.projectList"] && typeof stores["toonflow.projectList"] === "object" && !Array.isArray(stores["toonflow.projectList"])
    ? stores["toonflow.projectList"] as Record<string, unknown> : {};
  const previous = Array.isArray(persisted.projectList) ? persisted.projectList : [];
  const projectEntry = { directory: accounts.directory, name: "Toonflow Dev", lastOpenedAt: Date.now() };
  stores["toonflow.projectList"] = {
    project: persisted.project && typeof persisted.project === "object" ? persisted.project : projectEntry,
    projectList: [projectEntry, ...previous.filter(item => !item || typeof item !== "object" || (item as Record<string, unknown>).directory !== accounts.directory)],
  };
  userSettings.stores = stores;
  await auth.writeUserSettings(accounts.userId, userSettings, saved.revision);
  file.settings = settings;
  writeSettings(file);

  const media = mediaConfigs ? Object.keys(mediaConfigs).join(", ") : "未配置";
  console.log(`[seed] 数据目录：${DATA_DIR}`);
  console.log(`[seed] 语言模型：${textProvider ? `${textProvider.label}（${textProvider.models.length} 个模型）` : "未配置"}`);
  console.log(`[seed] 媒体模型：${media}`);
  console.log(`[seed] 平台模型：${routed.routes} 条路由 / ${routed.providers} 个供应商`);
  console.log(`[seed] 示例项目：${project.name}（${project.directory}）`);
  console.log(`[seed] 管理员：${accounts.adminUser}；普通用户：${accounts.userName}`);
  if (balance) console.log(`[seed] 测试余额：${balance} CNY`);
}

await main();
