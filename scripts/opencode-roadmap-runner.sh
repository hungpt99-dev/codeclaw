#!/usr/bin/env bash
set -Eeuo pipefail

# =============================================================================
# OpenCode Roadmap Runner
# =============================================================================
# Automatically runs OpenCode step by step through the Local AI Software Team
# roadmap. Step 01 is already completed. Starts from 00-docs-preflight by
# default if state is "01-engineering-foundation", otherwise resumes from state.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

AUTOMATION_DIR="$REPO_ROOT/.automation/opencode-roadmap"
STEPS_DIR="$AUTOMATION_DIR/steps"
LOGS_DIR="$AUTOMATION_DIR/logs"
STATE_FILE="$AUTOMATION_DIR/state"

# -----------------------------------------------------------------------------
# Environment variables with defaults
# -----------------------------------------------------------------------------
MAX_FIX_ATTEMPTS="${MAX_FIX_ATTEMPTS:-5}"
SKIP_COMMIT="${SKIP_COMMIT:-0}"
START_STEP="${START_STEP:-}"
QUALITY_COMMAND="${QUALITY_COMMAND:-}"

# -----------------------------------------------------------------------------
# Step definitions (in order)
# -----------------------------------------------------------------------------
STEP_IDS=(
  "00-docs-preflight"
  "02-monorepo-structure"
  "03-shared-package"
  "04-storage-package"
  "05-core-docs-workflow"
  "06-prompt-templates"
  "07-cli-mvp"
  "08-local-server-api"
  "09-cli-ui-command"
  "10-local-web-layout"
  "11-web-dashboard-runs"
  "12-web-new-requirement"
  "13-web-run-detail"
  "14-web-settings"
  "15-web-prompt-templates"
  "16-polish-mvp"
)

# Commit messages for each step (index-aligned with STEP_IDS)
STEP_COMMIT_MESSAGES=(
  "docs: add coding-agent documentation source of truth"
  "chore(repo): create monorepo structure"
  "feat(shared): add domain types and config schema"
  "feat(storage): add sqlite storage repositories"
  "feat(core): add docs-only workflow"
  "feat(prompts): add default agent prompt templates"
  "feat(cli): add MVP commands"
  "feat(server): add local API routes"
  "feat(cli): start local UI server"
  "feat(web): add local web layout"
  "feat(web): add dashboard and runs page"
  "feat(web): add new requirement workflow"
  "feat(web): add run detail page"
  "feat(web): add settings page"
  "feat(web): add prompt template editor"
  "chore(mvp): polish docs-only MVP"
)

# Lookup commit message by step ID
get_commit_message() {
  local step_id="$1"
  for i in "${!STEP_IDS[@]}"; do
    if [[ "${STEP_IDS[$i]}" == "$step_id" ]]; then
      echo "${STEP_COMMIT_MESSAGES[$i]}"
      return 0
    fi
  done
  echo "chore: step ${step_id}"
}

# -----------------------------------------------------------------------------
# Colors for output
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Logging helpers
# -----------------------------------------------------------------------------
log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $(date '+%H:%M:%S') $*"; }

# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------
print_banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}       ${GREEN}Local AI Software Team — OpenCode Roadmap Runner${NC}       ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# -----------------------------------------------------------------------------
# Prerequisite checks
# -----------------------------------------------------------------------------
check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v opencode &>/dev/null; then
    log_error "opencode is not installed or not in PATH."
    log_error "Install it from: https://opencode.ai"
    exit 1
  fi
  log_ok "opencode found: $(command -v opencode)"

  if ! command -v git &>/dev/null; then
    log_error "git is not installed or not in PATH."
    exit 1
  fi
  log_ok "git found: $(command -v git)"

  if ! git rev-parse --git-dir &>/dev/null; then
    log_warn "Not inside a git repository. Some features may not work."
  else
    log_ok "Inside git repository: $(git rev-parse --show-toplevel)"
  fi

  if ! command -v pnpm &>/dev/null; then
    log_error "pnpm is not installed or not in PATH."
    exit 1
  fi
  log_ok "pnpm found: $(command -v pnpm)"

  log_ok "All prerequisites satisfied."
}

# -----------------------------------------------------------------------------
# Ensure directories exist
# -----------------------------------------------------------------------------
ensure_dirs() {
  mkdir -p "$STEPS_DIR" "$LOGS_DIR"
}

# -----------------------------------------------------------------------------
# Load state
# -----------------------------------------------------------------------------
load_state() {
  if [[ -f "$STATE_FILE" ]]; then
    LAST_COMPLETED=$(cat "$STATE_FILE" | tr -d '[:space:]')
    log_info "Last completed step: ${GREEN}${LAST_COMPLETED}${NC}"
  else
    LAST_COMPLETED=""
    log_info "No state file found. Starting fresh."
  fi
}

# -----------------------------------------------------------------------------
# Save state
# -----------------------------------------------------------------------------
save_state() {
  local step_id="$1"
  echo "$step_id" > "$STATE_FILE"
  log_info "State saved: ${GREEN}${step_id}${NC}"
}

# -----------------------------------------------------------------------------
# Determine starting step index
# -----------------------------------------------------------------------------
get_start_index() {
  local target=""

  # START_STEP override takes priority
  if [[ -n "$START_STEP" ]]; then
    target="$START_STEP"
    log_info "START_STEP override: ${YELLOW}${target}${NC}" >&2
  elif [[ -n "$LAST_COMPLETED" ]]; then
    target="$LAST_COMPLETED"
    log_info "Resuming from last completed step: ${YELLOW}${target}${NC}" >&2
  else
    # Default: start from 00-docs-preflight
    target="00-docs-preflight"
    log_info "No previous state. Starting from default: ${YELLOW}${target}${NC}" >&2
  fi

  # Find the index of the target step, then return the NEXT step index
  for i in "${!STEP_IDS[@]}"; do
    if [[ "${STEP_IDS[$i]}" == "$target" ]]; then
      # If START_STEP was explicitly set, start at that step
      # If resuming from state, start at the NEXT step
      if [[ -n "$START_STEP" ]]; then
        echo "$i"
        return
      else
        echo "$((i + 1))"
        return
      fi
    fi
  done

  log_error "Step '${target}' not found in step list."
  log_error "Available steps: ${STEP_IDS[*]}"
  exit 1
}

# -----------------------------------------------------------------------------
# Determine quality command
# -----------------------------------------------------------------------------
get_quality_command() {
  if [[ -n "$QUALITY_COMMAND" ]]; then
    echo "$QUALITY_COMMAND"
    return
  fi

  # Check if pnpm quality exists in root package.json
  if [[ -f "$REPO_ROOT/package.json" ]]; then
    if grep -q '"quality"' "$REPO_ROOT/package.json" 2>/dev/null; then
      echo "pnpm quality"
      return
    fi
  fi

  # Fallback: build a command from available scripts
  local cmds=()
  cmds+=("pnpm install")

  if grep -q '"format:check"' "$REPO_ROOT/package.json" 2>/dev/null; then
    cmds+=("pnpm format:check")
  fi
  if grep -q '"lint"' "$REPO_ROOT/package.json" 2>/dev/null; then
    cmds+=("pnpm lint")
  fi
  if grep -q '"typecheck"' "$REPO_ROOT/package.json" 2>/dev/null; then
    cmds+=("pnpm typecheck")
  fi
  if grep -q '"test"' "$REPO_ROOT/package.json" 2>/dev/null; then
    cmds+=("pnpm test")
  fi
  if grep -q '"build"' "$REPO_ROOT/package.json" 2>/dev/null; then
    cmds+=("pnpm build")
  fi

  # Join with &&
  local joined=""
  for cmd in "${cmds[@]}"; do
    if [[ -z "$joined" ]]; then
      joined="$cmd"
    else
      joined="$joined && $cmd"
    fi
  done
  echo "$joined"
}

# -----------------------------------------------------------------------------
# Run quality checks
# -----------------------------------------------------------------------------
run_quality() {
  local step_id="$1"
  local log_file="$LOGS_DIR/${step_id}-quality.log"
  local quality_cmd
  quality_cmd=$(get_quality_command)

  log_info "Running quality checks: ${YELLOW}${quality_cmd}${NC}"

  if eval "$quality_cmd" > "$log_file" 2>&1; then
    log_ok "Quality checks passed."
    return 0
  else
    local exit_code=$?
    log_error "Quality checks failed (exit code: ${exit_code})."
    log_error "Quality log: ${log_file}"
    return 1
  fi
}

# -----------------------------------------------------------------------------
# Run OpenCode step
# -----------------------------------------------------------------------------
run_opencode_step() {
  local step_id="$1"
  local prompt_file="$STEPS_DIR/${step_id}.md"
  local log_file="$LOGS_DIR/${step_id}.log"

  if [[ ! -f "$prompt_file" ]]; then
    log_error "Prompt file not found: ${prompt_file}"
    return 1
  fi

  log_step "Running OpenCode for: ${GREEN}${step_id}${NC}"
  log_info "Prompt: ${prompt_file}"
  log_info "Log:    ${log_file}"

  if opencode run "$(cat "$prompt_file")" > "$log_file" 2>&1; then
    log_ok "OpenCode completed successfully."
    return 0
  else
    local exit_code=$?
    log_error "OpenCode failed (exit code: ${exit_code})."
    log_error "OpenCode log: ${log_file}"
    return 1
  fi
}

# -----------------------------------------------------------------------------
# Create and run fix prompt
# -----------------------------------------------------------------------------
run_fix_attempt() {
  local step_id="$1"
  local attempt="$2"
  local quality_log="$LOGS_DIR/${step_id}-quality.log"
  local fix_prompt_file="$LOGS_DIR/${step_id}-fix-attempt-${attempt}-prompt.md"
  local fix_log_file="$LOGS_DIR/${step_id}-fix-attempt-${attempt}.log"
  local quality_cmd
  quality_cmd=$(get_quality_command)

  log_warn "Creating fix prompt (attempt ${attempt}/${MAX_FIX_ATTEMPTS})..."

  # Read quality log content (truncate if too long)
  local quality_content
  quality_content=$(tail -n 100 "$quality_log" 2>/dev/null || echo "(quality log not available)")

  cat > "$fix_prompt_file" <<FIXEOF
## Mandatory Fix Documentation Context

This fix attempt is a new `opencode run` session.

Do not rely on memory from previous OpenCode runs.

Before fixing, read these files once for this session if they exist:

- /docs folder
- the current step prompt
- the quality log

After reading these once in this same fix session, do not reread them unless needed.

Fix only the quality issues shown in the quality log.

Rules:
- Do not implement unrelated features.
- Do not skip quality checks by weakening scripts.
- Do not remove tests to make quality pass.
- Do not bypass lint/typecheck/build.
- Keep changes minimal.
- Preserve the intended architecture.
- Do not make optional integrations required.
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- After fixing, summarize docs read and what changed.

Failed step:
${step_id}

Quality command:
${quality_cmd}

Quality log:
\`\`\`
${quality_content}
\`\`\`
FIXEOF

  log_info "Fix prompt saved: ${fix_prompt_file}"

  if opencode run "$(cat "$fix_prompt_file")" > "$fix_log_file" 2>&1; then
    log_ok "Fix attempt ${attempt} completed."
    return 0
  else
    local exit_code=$?
    log_error "Fix attempt ${attempt} failed (exit code: ${exit_code})."
    log_error "Fix log: ${fix_log_file}"
    return 1
  fi
}

# -----------------------------------------------------------------------------
# Auto commit
# -----------------------------------------------------------------------------
auto_commit() {
  local step_id="$1"
  local commit_msg
  commit_msg=$(get_commit_message "$step_id")

  if [[ "$SKIP_COMMIT" == "1" ]]; then
    log_info "SKIP_COMMIT=1, skipping commit for step: ${step_id}"
    return 0
  fi

  log_info "Checking for changes to commit..."

  local changes
  changes=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null || true)

  if [[ -z "$changes" ]]; then
    log_info "No changes to commit for this step."
    return 0
  fi

  log_info "Changes detected. Committing: ${GREEN}${commit_msg}${NC}"

  if git -C "$REPO_ROOT" add . && git -C "$REPO_ROOT" commit -m "$commit_msg"; then
    log_ok "Commit successful: ${commit_msg}"
    return 0
  else
    log_error "Commit failed."
    return 1
  fi
}

# -----------------------------------------------------------------------------
# Run a single step with quality + fix loop
# -----------------------------------------------------------------------------
run_step() {
  local step_id="$1"
  local prompt_file="$STEPS_DIR/${step_id}.md"
  local quality_cmd
  quality_cmd=$(get_quality_command)

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  log_step "Starting step: ${GREEN}${step_id}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  log_info "Current step:   ${GREEN}${step_id}${NC}"
  log_info "State:          ${GREEN}$(cat "$STATE_FILE" 2>/dev/null || echo "N/A")${NC}"
  log_info "Prompt:         ${prompt_file}"
  log_info "Log:            ${LOGS_DIR}/${step_id}.log"
  log_info "Auto commit:    ${GREEN}$([[ "$SKIP_COMMIT" == "1" ]] && echo "disabled" || echo "enabled")${NC}"
  log_info "Quality cmd:    ${YELLOW}${quality_cmd}${NC}"
  log_warn "Session rule:   this is a new OpenCode session. Read docs once before coding."
  log_warn "                Do not rely on previous session memory."
  echo ""

  # Check prompt file exists
  if [[ ! -f "$prompt_file" ]]; then
    log_error "Prompt file not found: ${prompt_file}"
    return 1
  fi

  # Run OpenCode
  if ! run_opencode_step "$step_id"; then
    log_error "OpenCode failed for step: ${step_id}"
    return 1
  fi

  # Run quality checks
  if run_quality "$step_id"; then
    # Quality passed
    log_ok "Step ${step_id} passed quality checks."
  else
    # Quality failed — try fix loop
    log_warn "Quality failed. Starting fix loop (max ${MAX_FIX_ATTEMPTS} attempts)..."

    local fixed=false
    for ((attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++)); do
      log_warn "Fix attempt ${attempt}/${MAX_FIX_ATTEMPTS}..."

      if run_fix_attempt "$step_id" "$attempt"; then
        if run_quality "$step_id"; then
          log_ok "Quality passed after fix attempt ${attempt}."
          fixed=true
          break
        else
          log_warn "Quality still failing after fix attempt ${attempt}."
        fi
      else
        log_error "Fix attempt ${attempt} failed to run."
      fi
    done

    if [[ "$fixed" != "true" ]]; then
      log_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      log_error "Quality still failing after ${MAX_FIX_ATTEMPTS} fix attempts."
      log_error "Failed step: ${step_id}"
      log_error "Quality log: ${LOGS_DIR}/${step_id}-quality.log"
      log_error "Last OpenCode log: ${LOGS_DIR}/${step_id}.log"
      log_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      return 1
    fi
  fi

  # Auto commit
  if ! auto_commit "$step_id"; then
    log_error "Commit failed for step: ${step_id}"
    return 1
  fi

  # Update state
  save_state "$step_id"

  log_ok "Step ${step_id} completed successfully."
  return 0
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
  print_banner

  check_prerequisites
  ensure_dirs
  load_state

  local start_index
  start_index=$(get_start_index)

  local total_steps=${#STEP_IDS[@]}

  if [[ "$start_index" -ge "$total_steps" ]]; then
    log_ok "All steps are already completed. Nothing to do."
    exit 0
  fi

  log_info "Configuration:"
  log_info "  MAX_FIX_ATTEMPTS = ${MAX_FIX_ATTEMPTS}"
  log_info "  SKIP_COMMIT      = ${SKIP_COMMIT}"
  log_info "  QUALITY_COMMAND  = ${QUALITY_COMMAND:-"(auto-detect)"}"
  log_info "  Starting from    = ${STEP_IDS[$start_index]} (index ${start_index})"
  log_info "  Total steps      = ${total_steps}"
  echo ""

  local failed_steps=()

  for ((i = start_index; i < total_steps; i++)); do
    local step_id="${STEP_IDS[$i]}"
    local step_num=$((i + 1))

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  Step ${step_num}/${total_steps}: ${step_id}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"

    if run_step "$step_id"; then
      log_ok "Step ${step_id} complete. State: ${GREEN}$(cat "$STATE_FILE")${NC}"
    else
      log_error "Step ${step_id} FAILED. Stopping runner."
      failed_steps+=("$step_id")
      break
    fi
  done

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
  if [[ ${#failed_steps[@]} -eq 0 ]]; then
    echo -e "${CYAN}║${NC}  ${GREEN}All steps completed successfully!${NC}"
    echo -e "${CYAN}║${NC}  Final state: ${GREEN}$(cat "$STATE_FILE" 2>/dev/null || echo "N/A")${NC}"
  else
    echo -e "${CYAN}║${NC}  ${RED}Runner stopped due to failures.${NC}"
    echo -e "${CYAN}║${NC}  Failed steps: ${RED}${failed_steps[*]}${NC}"
    echo -e "${CYAN}║${NC}  Check logs in: ${LOGS_DIR}"
  fi
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ ${#failed_steps[@]} -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
