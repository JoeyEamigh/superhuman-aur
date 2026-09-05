#!/bin/bash
set -euo pipefail

pacman -Syu --noconfirm --needed --quiet >/dev/null

if ! id builder >/dev/null 2>&1; then
  useradd -m builder
  echo 'builder ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/builder
  chmod 0440 /etc/sudoers.d/builder
fi
chown -R builder:builder /pkgbuild

LOG=/tmp/makepkg.log
set +e
sudo -u builder bash -c 'cd /pkgbuild && makepkg --cleanbuild --noarchive --syncdeps --noconfirm --needed' 2>&1 | tee "$LOG"
rc=${PIPESTATUS[0]}
set -e

if [ "$rc" -ne 0 ]; then
  echo "::error::makepkg failed (exit $rc). prepare()/build()/package() did not complete."
  exit "$rc"
fi

# makepkg exits 0 when only optional patches fail, so the publish gate checks the log.
if grep -q 'PATCH FAILED' "$LOG"; then
  echo "::error::A Linux compatibility patch no longer applies to the current upstream build. Not publishing."
  grep -E 'PATCH FAILED|expected [0-9]+ match|anchor:|optional patch\(es\) failed|  - ' "$LOG" || true
  exit 1
fi

echo "All Linux compatibility patches applied cleanly against upstream:"
grep -E '^  -> Applied:' "$LOG"
