from typing import Optional


def get_tenant_cookie_domain(host: str) -> Optional[str]:
    if not host:
        return None
    host = host.split(':', 1)[0].lower()
    parts = host.split('.')
    # Expect: <service>.<org>.<root>.<tld>
    if len(parts) < 4:
        return None
    tenant_parent = '.'.join(parts[1:])
    return f".{tenant_parent}"


def get_canonical_slug(org_slug: str) -> str:
    s = (org_slug or '').lower()
    return s[5:] if s.startswith('local') else s


