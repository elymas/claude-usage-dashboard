#!/bin/bash
set -euo pipefail

CONFIG_DIR="$HOME/.claude-collector"
CONFIG_FILE="$CONFIG_DIR/config.json"
PLIST_NAME="com.usage-dashboard.collector"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Helpers ---
info()  { echo "[INFO]  $*"; }
error() { echo "[ERROR] $*" >&2; }

# --- Reauth mode ---
if [[ "${1:-}" == "--reauth" ]]; then
  if [[ ! -f "$CONFIG_FILE" ]]; then
    error "No config found at $CONFIG_FILE. Run install.sh first."
    exit 1
  fi
  read -rp "Supabase URL (press Enter to keep current): " new_url
  read -rp "API Key (press Enter to keep current): " new_key
  if [[ -n "$new_url" ]]; then
    tmp=$(mktemp)
    python3 -c "
import json, sys
c = json.load(open('$CONFIG_FILE'))
c['supabaseUrl'] = '$new_url'
c['functionUrl'] = '$new_url/functions/v1/upload'
json.dump(c, open('$tmp', 'w'), indent=2)
"
    mv "$tmp" "$CONFIG_FILE"
  fi
  if [[ -n "$new_key" ]]; then
    tmp=$(mktemp)
    python3 -c "
import json
c = json.load(open('$CONFIG_FILE'))
c['apiKey'] = '$new_key'
json.dump(c, open('$tmp', 'w'), indent=2)
"
    mv "$tmp" "$CONFIG_FILE"
  fi
  info "Config updated."
  exit 0
fi

# --- Prerequisites ---
if ! command -v node &>/dev/null; then
  error "Node.js is required but not installed."
  echo "Install it from https://nodejs.org/ (v18+ required)"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if (( NODE_VERSION < 18 )); then
  error "Node.js 18+ required. Found: $(node -v)"
  exit 1
fi

# --- Config ---
mkdir -p "$CONFIG_DIR"
mkdir -p "$CONFIG_DIR/pending"

if [[ -f "$CONFIG_FILE" ]]; then
  info "Config already exists at $CONFIG_FILE"
  read -rp "Overwrite? [y/N] " overwrite
  if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
    info "Keeping existing config."
  else
    rm "$CONFIG_FILE"
  fi
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo ""
  echo "=== Claude Usage Dashboard Collector Setup ==="
  echo ""
  read -rp "Your User ID (UUID from Supabase): " user_id
  read -rp "Your API Key (from Supabase profile): " api_key
  read -rp "Supabase Project URL (e.g. https://xxx.supabase.co): " supabase_url

  cat > "$CONFIG_FILE" << EOF
{
  "userId": "$user_id",
  "apiKey": "$api_key",
  "supabaseUrl": "$supabase_url",
  "functionUrl": "$supabase_url/functions/v1/upload"
}
EOF
  info "Config written to $CONFIG_FILE"
fi

# --- Install dependencies ---
info "Installing collector dependencies..."
cd "$SCRIPT_DIR"
if command -v pnpm &>/dev/null; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
  npm install
fi

# --- launchd plist ---
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_NAME</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(which node)</string>
    <string>$(which npx)</string>
    <string>tsx</string>
    <string>$SCRIPT_DIR/src/index.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$SCRIPT_DIR</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$CONFIG_DIR/collector.log</string>
  <key>StandardErrorPath</key>
  <string>$CONFIG_DIR/collector.error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

info "launchd agent installed at $PLIST_PATH"
info "Collector will run daily at 9:00 AM."
echo ""
echo "To run manually:  cd $SCRIPT_DIR && npx tsx src/index.ts"
echo "To uninstall:     launchctl unload $PLIST_PATH && rm $PLIST_PATH"
echo "Logs:             $CONFIG_DIR/collector.log"
