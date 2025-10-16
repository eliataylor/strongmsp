import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../allauth/auth";
import { USER_TYPE } from "../object-actions/types/types";
import { useActiveRole } from "./ActiveRoleContext";

interface RoleProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles: USER_TYPE[];
    requireAll?: boolean;
}

export function RoleProtectedRoute({
    children,
    requiredRoles,
    requireAll = false
}: RoleProtectedRouteProps) {
    const location = useLocation();
    const auth = useAuth();
    const { activeRole, availableRoles, canAccess } = useActiveRole();

    console.log("[USERTYPE] RoleProtectedRoute - requiredRoles:", requiredRoles);
    console.log("[USERTYPE] RoleProtectedRoute - activeRole:", activeRole);
    console.log("[USERTYPE] RoleProtectedRoute - availableRoles:", availableRoles);
    console.log("[USERTYPE] RoleProtectedRoute - requireAll:", requireAll);

    // Check if user is authenticated
    if (!auth?.data?.user) {
        console.log("[USERTYPE] RoleProtectedRoute - redirecting to login");
        const next = `next=${encodeURIComponent(location.pathname + location.search)}`;
        return <Navigate to={`/account/login?${next}`} />;
    }

    // Check if user has groups assigned (role selection completed)
    if (!auth.data.user.groups || auth.data.user.groups.length === 0) {
        console.log("[USERTYPE] RoleProtectedRoute - redirecting to role selection");
        return <Navigate to="/onboarding/role-selection" />;
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requireAll
        ? requiredRoles.every(role => availableRoles.includes(role))
        : requiredRoles.some(role => availableRoles.includes(role));

    console.log("[USERTYPE] RoleProtectedRoute - hasRequiredRole:", hasRequiredRole);

    if (!hasRequiredRole) {
        console.log("[USERTYPE] RoleProtectedRoute - access denied, redirecting to home");
        // User doesn't have any of the required roles
        return (
            <Navigate
                to="/"
                state={{
                    error: `Access denied. This page requires ${requiredRoles.join(' or ')} access.`
                }}
            />
        );
    }

    // Check if user has the required role but wrong active role
    const hasActiveRequiredRole = requiredRoles.includes(activeRole!);
    console.log("[USERTYPE] RoleProtectedRoute - hasActiveRequiredRole:", hasActiveRequiredRole);

    if (!hasActiveRequiredRole) {
        console.log("[USERTYPE] RoleProtectedRoute - redirecting to role switch prompt");
        // User has the role but needs to switch to it
        const next = `next=${encodeURIComponent(location.pathname + location.search)}`;
        const required = requiredRoles[0]; // Use first required role
        return <Navigate to={`/switch-role?required=${required}&${next}`} />;
    }

    // User has the correct active role, render the protected content
    return <>{children}</>;
}
