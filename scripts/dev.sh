#!/usr/bin/env bash
# Toonflow 本地 dev 一键启动（macOS / Linux）。
#
# 自动完成：安装依赖 -> 构建插件/Web -> seed 模型/账号/示例项目 -> 启动前后端 -> 健康检查。
# 3 个密钥（豆包 Seed LLM / Seedream / Seedance）从 .env.dev.local 读取，不进入源码或终端输出。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${TOONFLOW_DEV_DATA_DIR:-$REPO_ROOT/.local/dev-data}"
LOG_DIR="$REPO_ROOT/.local/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
WEB_LOG="$LOG_DIR/web.log"
BACKEND_PORT="${TOONFLOW_DEV_BACKEND_PORT:-3100}"
FRONTEND_PORT="${TOONFLOW_DEV_FRONTEND_PORT:-5180}"
ENV_FILE="${TOONFLOW_DEV_ENV_FILE:-$REPO_ROOT/.env.dev.local}"
REBUILD=0

log() { printf '\033[36m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[dev]\033[0m %s\n' "$*"; }
die() { printf '\033[31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
用法：
  ./scripts/dev.sh
  ./scripts/dev.sh --backend-port=3100 --frontend-port=5180
  ./scripts/dev.sh --env-file=.env.dev.local
  ./scripts/dev.sh --rebuild
  TOONFLOW_DEV_DATA_DIR=.local/dev-data ./scripts/dev.sh

默认读取仓库根目录 .env.dev.local；模板见 scripts/dev.env.example。
模板已预置豆包 Seed LLM / Seedream / Seedance 三个 Key 的位置，只需填这 3 项。
EOF
}

for arg in "$@"; do
  case "$arg" in
    --backend-port=*) BACKEND_PORT="${arg#*=}" ;;
    --frontend-port=*) FRONTEND_PORT="${arg#*=}" ;;
    --env-file=*) ENV_FILE="${arg#*=}" ;;
    --rebuild) REBUILD=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数：${arg}" ;;
  esac
done

# 相对路径统一按仓库根目录解析，避免 seed 与后端从不同 cwd 解析到两个数据目录。
normalize_path() {
  case "$1" in
    "~/"*) printf '%s/%s' "$HOME" "${1#~/}" ;;
    /*) printf '%s' "$1" ;;
    *) printf '%s/%s' "$REPO_ROOT" "$1" ;;
  esac
}
DATA_DIR="$(normalize_path "$DATA_DIR")"
ENV_FILE="$(normalize_path "$ENV_FILE")"

if [ -f "$ENV_FILE" ]; then
  export TOONFLOW_DEV_MULTITENANT="$(sed -n 's/^TOONFLOW_DEV_MULTITENANT=//p' "$ENV_FILE" | tr -d '\r' | tail -n 1)"
else
  die "未找到 ${ENV_FILE}。请执行：cp scripts/dev.env.example .env.dev.local，然后填写 3 个 API Key（豆包 Seed LLM / Seedream / Seedance）"
fi
[[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] && [ "$BACKEND_PORT" -ge 1 ] && [ "$BACKEND_PORT" -le 65535 ] || die "后端端口无效：$BACKEND_PORT"
[[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] && [ "$FRONTEND_PORT" -ge 1 ] && [ "$FRONTEND_PORT" -le 65535 ] || die "前端端口无效：$FRONTEND_PORT"
[ "$BACKEND_PORT" != "$FRONTEND_PORT" ] || die "前后端端口不能相同"

if ! command -v bun >/dev/null 2>&1 && [ -x "$REPO_ROOT/.local/bin/bun" ]; then
  export PATH="$REPO_ROOT/.local/bin:$PATH"
fi
command -v bun >/dev/null 2>&1 || die "未找到 bun，请先安装 Bun 1.4+"
command -v curl >/dev/null 2>&1 || die "未找到 curl"

# 项目锁定的 undici 版本需要 Bun 1.4.3+；版本不足时安装一份到仓库 .local/，不修改系统 Bun。
version_at_least() {
  [ "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)" = "$1" ]
}
if ! version_at_least "1.4.3" "$(bun --version)"; then
  if [ ! -x "$REPO_ROOT/.local/bin/bun" ]; then
    command -v bunx >/dev/null 2>&1 || die "需要 Bun 1.4.3+，请升级后再运行"
    log "安装 Bun 1.4.3 到 .local/bin（不修改系统 Bun）..."
    mkdir -p "$REPO_ROOT/.local/bin"
    BUN_SOURCE="$(bunx bun@1.4.3 -e 'console.log(process.execPath)')" || die "安装 Bun 1.4.3 失败"
    cp "$BUN_SOURCE" "$REPO_ROOT/.local/bin/bun"
    chmod +x "$REPO_ROOT/.local/bin/bun"
  fi
  export PATH="$REPO_ROOT/.local/bin:$PATH"
  log "使用本地 Bun $(bun --version)"
fi

port_used() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (echo >"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
  fi
}

for item in "$BACKEND_PORT:后端" "$FRONTEND_PORT:前端"; do
  port="${item%%:*}"; label="${item#*:}"
  port_used "$port" && die "${label}端口 $port 已被占用，请用 --backend-port / --frontend-port 更换"
done
if [ "${TOONFLOW_DEV_MULTITENANT:-0}" = "1" ]; then
  port_used 10888 && die "创作端口 10888 已被占用，请先停止占用进程"
fi

export TOONFLOW_DEV_BACKEND_PORT="$BACKEND_PORT"
export TOONFLOW_DEV_FRONTEND_PORT="$FRONTEND_PORT"
export TOONFLOW_SERVER_PORT="$BACKEND_PORT"
export TOONFLOW_DATA_DIR="$DATA_DIR"
export TOONFLOW_DEV_DATA_DIR="$DATA_DIR"
export NO_PROXY="${NO_PROXY:+${NO_PROXY},}127.0.0.1,localhost,::1"
export no_proxy="$NO_PROXY"

mkdir -p "$DATA_DIR" "$LOG_DIR"

if [ ! -d "$REPO_ROOT/node_modules" ]; then
  log "安装依赖（bun install --frozen-lockfile）..."
  (cd "$REPO_ROOT" && bun install --frozen-lockfile)
fi

if [ "$REBUILD" = "1" ] || [ ! -d "$REPO_ROOT/build/tools" ] || [ -z "$(ls -A "$REPO_ROOT/build/tools" 2>/dev/null)" ] \
  || [ ! -d "$REPO_ROOT/build/nodes" ] || [ -z "$(ls -A "$REPO_ROOT/build/nodes" 2>/dev/null)" ] \
  || [ ! -d "$REPO_ROOT/build/ext" ] || [ -z "$(ls -A "$REPO_ROOT/build/ext" 2>/dev/null)" ]; then
  log "构建内置节点、工具与扩展（首次较慢）..."
  (cd "$REPO_ROOT" && bun run dev:plugins)
fi

if [ "${TOONFLOW_DEV_MULTITENANT:-0}" = "1" ] && { [ "$REBUILD" = "1" ] || [ ! -d "$REPO_ROOT/build/web" ] || [ -z "$(ls -A "$REPO_ROOT/build/web" 2>/dev/null)" ]; }; then
  log "构建 Web（多租户创作入口需要静态资源）..."
  (cd "$REPO_ROOT" && bun run --filter '@toonflow/web' build)
fi

log "写入测试数据（模型、账号、示例项目）..."
(cd "$REPO_ROOT" && bun --env-file "$ENV_FILE" scripts/dev-seed.ts)

SEEDED_MODELS="$(cd "$REPO_ROOT" && bun --env-file "$ENV_FILE" -e 'const s=JSON.parse(await Bun.file(process.env.TOONFLOW_DATA_DIR+"/settings.json").text()).settings; console.log((s.customProviders?.length??0)+" 个语言供应商 / "+Object.keys(s.mediaProviderConfigs??{}).length+" 个媒体供应商")')"

log "启动后端 :$BACKEND_PORT ..."
(cd "$REPO_ROOT/apps/server" && exec env NODE_ENV=dev bun src/index.ts) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

log "启动前端 :$FRONTEND_PORT ..."
(cd "$REPO_ROOT/apps/web" && exec "$REPO_ROOT/apps/web/node_modules/.bin/vite" --host 0.0.0.0 --port "$FRONTEND_PORT") >"$WEB_LOG" 2>&1 &
WEB_PID=$!

kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  log "停止前后端..."
  kill_tree "$BACKEND_PID"
  kill_tree "$WEB_PID"
  wait "$BACKEND_PID" "$WEB_PID" 2>/dev/null || true
}
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
trap cleanup EXIT

wait_http() {
  local url="$1" label="$2" logfile="$3" origin="$4"
  local deadline=$(( $(date +%s) + 180 ))
  log "等待${label}就绪..."
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if [ -n "$origin" ]; then
      curl -fsS --noproxy '*' --max-time 2 -H "Origin: $origin" -H "x-toonflow-workspace: 1" "$url" >/dev/null 2>&1 && return 0
    else
      curl -fsS --noproxy '*' --max-time 2 "$url" >/dev/null 2>&1 && return 0
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      warn "后端已退出，日志：$BACKEND_LOG"
      tail -n 30 "$BACKEND_LOG" >&2 || true
      return 1
    fi
    if ! kill -0 "$WEB_PID" 2>/dev/null; then
      warn "前端已退出，日志：$WEB_LOG"
      tail -n 30 "$WEB_LOG" >&2 || true
      return 1
    fi
    sleep 1
  done
  warn "${label}未在 3 分钟内就绪，日志：$logfile"
  tail -n 30 "$logfile" >&2 || true
  return 1
}

if [ "${TOONFLOW_DEV_MULTITENANT:-0}" = "1" ]; then
  wait_http "http://127.0.0.1:10888/api/multiTenant/user/session" "后端" "$BACKEND_LOG" "http://127.0.0.1:10888" || exit 1
else
  wait_http "http://127.0.0.1:${BACKEND_PORT}/api/settings/get" "后端" "$BACKEND_LOG" "http://127.0.0.1:${BACKEND_PORT}" || exit 1
fi
wait_http "http://127.0.0.1:${FRONTEND_PORT}/" "前端" "$WEB_LOG" "" || exit 1

echo
log "Toonflow 本地 dev 环境已就绪"
log "  前端：http://localhost:${FRONTEND_PORT}"
log "  后端：http://127.0.0.1:${BACKEND_PORT}"
log "  数据：${DATA_DIR}"
log "  已 seed：${SEEDED_MODELS}"
if [ "${TOONFLOW_DEV_MULTITENANT:-0}" = "1" ]; then
  log "  创作入口：http://127.0.0.1:10888（用上面的测试账号登录）"
fi
log "  测试账号：见 ${ENV_FILE}（默认 admin / admin123456、test / test123456）"
log "按 Ctrl+C 停止前后端"

while kill -0 "$BACKEND_PID" 2>/dev/null; do
  kill -0 "$WEB_PID" 2>/dev/null || break
  sleep 1
done
