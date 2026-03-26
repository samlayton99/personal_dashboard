#!/bin/bash
set -e

# ============================================================
# deploy.sh — Deploy First Principles Dashboard to Vercel
#
# Reads env vars from .env.local and pushes them to Vercel,
# then triggers a production deployment.
#
# Usage: ./deploy.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi

# Load env vars from .env.local
set -a
source "$ENV_FILE"
set +a

if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN not set in .env.local"
  exit 1
fi

# Vercel scope (team/account slug)
VERCEL_SCOPE="samlayton99s-projects"

# Env vars to push to Vercel (all environments: production, preview, development)
ENV_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "AGENT_API_KEY"
  "ANTHROPIC_API_KEY"
  "LLM_PROVIDER"
  "ALLOWED_EMAIL"
)

cd "$SCRIPT_DIR"

# Install Vercel CLI locally if not present
if ! npx --no vercel --version &>/dev/null 2>&1; then
  echo "Installing Vercel CLI..."
  npm install --save-dev vercel
fi

VERCEL="npx vercel --token=$VERCEL_TOKEN --scope=$VERCEL_SCOPE"

# Link project if not already linked
if [ ! -d ".vercel" ]; then
  echo "Linking project to Vercel..."
  $VERCEL link --yes
fi

# Push env vars
echo ""
echo "Pushing environment variables to Vercel..."
for VAR_NAME in "${ENV_VARS[@]}"; do
  VAR_VALUE="${!VAR_NAME}"
  if [ -z "$VAR_VALUE" ]; then
    echo "  Skipping $VAR_NAME (empty)"
    continue
  fi

  # Set var for production and development
  for ENV in production development; do
    $VERCEL env rm "$VAR_NAME" "$ENV" -y 2>/dev/null || true
    $VERCEL env add "$VAR_NAME" "$ENV" --value "$VAR_VALUE" --yes 2>/dev/null || true
  done
  echo "  Set $VAR_NAME"
done

# Deploy to production
echo ""
echo "Deploying to production..."
$VERCEL --prod

echo ""
echo "Deploy complete!"
