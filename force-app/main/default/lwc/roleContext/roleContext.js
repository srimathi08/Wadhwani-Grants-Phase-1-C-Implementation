/**
 * roleContext — single source of truth for the active WCF portal role.
 *
 * Storage is two-layered:
 *
 *   1. sessionStorage — survives navigation to pages that forgot to carry
 *      the param. This is the workhorse. Per-tab, so two tabs can sit in
 *      two different roles, which is what a multi-role user actually wants.
 *   2. ?role= in the URL — the shareable, deep-linkable override. When
 *      present and valid it always wins over storage.
 *
 * The storage layer exists because not every navigation in the portal is
 * under this module's control (record links, standard__webPage jumps from
 * child components, browser back). Without it the role silently resets to
 * the first held role on any such hop.
 *
 * SECURITY: none of this is an authorization boundary. Anyone can type
 * ?role=approver or edit sessionStorage. Apex behind every role-gated page
 * must independently re-check the Account checkboxes for the running user —
 * see WCFPortalUserController.assertRole().
 */

export const ROLE_PARAM = 'role';
const STORAGE_KEY = 'wcfActiveRole';

export const ROLES = {
    VALIDATOR: 'validator',
    REVIEWER: 'reviewer',
    APPROVER: 'approver'
};

/** Priority order. Drives dropdown order and the last-resort default. */
export const ROLE_ORDER = [ROLES.VALIDATOR, ROLES.REVIEWER, ROLES.APPROVER];

export const ROLE_LABELS = {
    [ROLES.VALIDATOR]: 'Validator',
    [ROLES.REVIEWER]: 'Reviewer',
    [ROLES.APPROVER]: 'Approver'
};

const CONTEXT_FLAG = {
    [ROLES.VALIDATOR]: 'isValidator',
    [ROLES.REVIEWER]: 'isReviewer',
    [ROLES.APPROVER]: 'isApprover'
};

/**
 * Roles the user actually holds, in priority order. Guests hold none.
 * Expects { isGuest, isValidator, isReviewer, isApprover }.
 */
export function getHeldRoles(context) {
    if (!context || context.isGuest) {
        return [];
    }
    return ROLE_ORDER.filter((role) => context[CONTEXT_FLAG[role]] === true);
}

/** Raw ?role= value, lowercased. Null when absent. */
export function getRoleFromUrl() {
    try {
        const value = new URLSearchParams(window.location.search).get(ROLE_PARAM);
        return value ? value.trim().toLowerCase() : null;
    } catch (e) {
        return null;
    }
}

function readStoredRole() {
    try {
        const value = window.sessionStorage.getItem(STORAGE_KEY);
        return value ? value.trim().toLowerCase() : null;
    } catch (e) {
        return null; // private mode, storage disabled, etc.
    }
}

function writeStoredRole(role) {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, role);
    } catch (e) {
        // Non-fatal — the URL param still carries the role for this page.
    }
}

/**
 * Decides the active role.
 *
 * 1. ?role= in the URL, when the user holds it. Deep links and explicit
 *    switches win.
 * 2. The role stored for this tab, when the user holds it. Covers every
 *    navigation that dropped the param.
 * 3. First held role.
 * 4. No roles held, or guest → null.
 *
 * A value naming a role the user does not hold is discarded silently at
 * every layer — URLs get shared between users and that must never error.
 */
export function resolveActiveRole(context) {
    const held = getHeldRoles(context);
    if (held.length === 0) {
        return null;
    }

    const fromUrl = getRoleFromUrl();
    if (fromUrl && held.includes(fromUrl)) {
        return fromUrl;
    }

    const fromStorage = readStoredRole();
    if (fromStorage && held.includes(fromStorage)) {
        return fromStorage;
    }

    return held[0];
}

/**
 * Commits the resolved role: writes it to storage and stamps it into the
 * URL without reloading, so the address bar is always shareable and the
 * next navigation has a fallback even if it drops the param.
 *
 * Call this once, after resolveActiveRole, on every page that reads a role.
 */
export function persistRole(role) {
    if (!role) {
        return;
    }
    writeStoredRole(role);
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.get(ROLE_PARAM) === role) {
            return;
        }
        url.searchParams.set(ROLE_PARAM, role);
        window.history.replaceState(null, '', url.toString());
    } catch (e) {
        console.warn('Could not sync role to URL', e);
    }
}

/**
 * Appends ?role= to a path so in-app links carry the role forward.
 * Returns a relative path suitable for href or standard__webPage.
 */
export function withRole(path, role) {
    if (!path || !role) {
        return path;
    }
    try {
        const url = new URL(path, window.location.origin);
        url.searchParams.set(ROLE_PARAM, role);
        return `${url.pathname}${url.search}${url.hash}`;
    } catch (e) {
        return path;
    }
}

/**
 * Switches role and navigates.
 *
 * Pass targetPath to land on that role's home — picking "Reviewer" should
 * take you to the reviewer's dashboard, not leave you on a validator page
 * that just vanished from the nav. Omit it to switch in place.
 *
 * Writes storage before navigating so the new role survives even if the
 * destination strips the query string.
 */
export function setActiveRole(role, targetPath) {
    if (!role) {
        return;
    }
    writeStoredRole(role);
    try {
        const url = targetPath
            ? new URL(targetPath, window.location.origin)
            : new URL(window.location.href);
        url.searchParams.set(ROLE_PARAM, role);
        window.location.assign(url.toString());
    } catch (e) {
        console.error('Could not set active role', e);
    }
}