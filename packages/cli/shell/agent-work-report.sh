#!/usr/bin/env bash
# Source this file from ~/.bashrc or ~/.zshrc after installing agent-work-report.

agent_work_report_auto() {
  case $- in
    *i*) ;;
    *) return ;;
  esac

  if [ -n "${AWR_DISABLE_AUTO:-}" ]; then
    return
  fi

  local awr_bin="${AWR_BIN:-agent-work-report}"
  if ! command -v "$awr_bin" >/dev/null 2>&1; then
    return
  fi

  local current_dir="$PWD"
  if [ "${_AWR_LAST_DIR:-}" = "$current_dir" ]; then
    return
  fi

  _AWR_LAST_DIR="$current_dir"
  "$awr_bin" --compact --theme "${AWR_THEME:-auto}" "$current_dir" 2>/dev/null || true
}

if [ -n "${ZSH_VERSION:-}" ]; then
  autoload -U add-zsh-hook 2>/dev/null || true
  add-zsh-hook chpwd agent_work_report_auto 2>/dev/null || true
  agent_work_report_auto
elif [ -n "${BASH_VERSION:-}" ]; then
  case ";${PROMPT_COMMAND:-};" in
    *";agent_work_report_auto;"*) ;;
    *) PROMPT_COMMAND="agent_work_report_auto${PROMPT_COMMAND:+;${PROMPT_COMMAND}}" ;;
  esac
  agent_work_report_auto
fi
