"""Read-only Vercel deployment evidence. Never deploys, promotes, or aliases."""

import argparse
import json
import re
import subprocess
import sys


def snapshot(data, project, target, sha=None, domain=None):
    state = data.get('readyState')
    meta = data.get('meta') or {}
    actual_sha = meta.get('githubCommitSha') or meta.get('gitCommitSha')
    actual_target = data.get('target')
    # Vercel's API represents ordinary previews with target=null.
    if 'target' in data and actual_target is None and not data.get('customEnvironment'):
        actual_target = 'preview'
    aliases = [item for item in (data.get('alias') or []) if isinstance(item, str)]
    evidence = {
        'id': data.get('id'),
        'project': data.get('name'),
        'target': actual_target,
        'state': state,
        'url': data.get('url'),
        'sha': actual_sha,
        'aliases': aliases,
        'commitVerified': bool(sha and actual_sha == sha),
        'platformReady': state == 'READY',
        'uiVerified': False,
    }
    if project not in (data.get('name'), data.get('projectId')):
        return 1, {**evidence, 'result': 'PROJECT_MISMATCH'}
    if actual_target != target:
        return 1, {**evidence, 'result': 'TARGET_MISMATCH'}
    if sha and actual_sha and actual_sha != sha:
        return 1, {**evidence, 'result': 'COMMIT_MISMATCH'}
    if state in ('ERROR', 'CANCELED', 'CANCELLED', 'DELETED'):
        return 1, {**evidence, 'result': 'FAILED'}
    if state in ('INITIALIZING', 'QUEUED', 'BUILDING'):
        return 2, {**evidence, 'result': 'PENDING'}
    if state != 'READY':
        return 3, {**evidence, 'result': 'UNKNOWN_STATE'}
    if sha and not actual_sha:
        return 1, {**evidence, 'result': 'COMMIT_UNVERIFIED'}
    if domain and domain not in aliases:
        return 2, {**evidence, 'result': 'WAITING_ALIAS'}
    return 0, {**evidence, 'result': 'READY_FOR_UI_CHECK'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('deployment', help='Deployment ID dpl_..., not a branch alias')
    parser.add_argument('--scope', required=True)
    parser.add_argument('--project', required=True, help='Expected project name or ID')
    parser.add_argument('--target', required=True, choices=('preview', 'production'))
    parser.add_argument('--sha', help='Expected full 40-character Git SHA')
    parser.add_argument('--domain', help='Expected production hostname, without scheme')
    args = parser.parse_args()
    if not re.fullmatch(r'dpl_[A-Za-z0-9]+', args.deployment):
        parser.error('Use a deployment ID beginning with dpl_')
    if args.sha and not re.fullmatch(r'[a-fA-F0-9]{40}', args.sha):
        parser.error('--sha must be a full Git SHA')
    if args.domain and not re.fullmatch(r'[A-Za-z0-9.-]+', args.domain):
        parser.error('--domain must be a hostname without credentials or query string')
    command = [
        'vercel', 'api', f'/v13/deployments/{args.deployment}',
        '--scope', args.scope, '--raw',
    ]
    try:
        response = subprocess.run(
            command, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=45
        )
        if response.returncode:
            raise RuntimeError('CLI_READ_FAILED')
        data = json.loads(response.stdout)
        if not isinstance(data, dict) or data.get('error'):
            raise RuntimeError('API_READ_FAILED')
    except FileNotFoundError:
        print(json.dumps({'result': 'VERCEL_CLI_MISSING'}))
        return 3
    except (RuntimeError, ValueError, subprocess.TimeoutExpired):
        # Do not echo raw API responses, CLI diagnostics, or environment values.
        print(json.dumps({'result': 'READ_FAILED', 'next': 'Check CLI auth/help separately'}))
        return 3
    code, evidence = snapshot(data, args.project, args.target, args.sha, args.domain)
    print(json.dumps(evidence, ensure_ascii=False))
    return code


if __name__ == '__main__':
    sys.exit(main())
