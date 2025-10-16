import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "../allauth/auth";
import { USER_TYPE } from "../object-actions/types/types";

// Define the shape of the context value
interface ActiveRoleContextType {
    activeRole: USER_TYPE | null;
    availableRoles: USER_TYPE[];
    setActiveRole: (role: USER_TYPE) => void;
    hasRole: (role: USER_TYPE) => boolean;
    canAccess: (requiredRoles: USER_TYPE[]) => boolean;
}

// Create the context with a default value
const ActiveRoleContext = createContext<ActiveRoleContextType | undefined>(undefined);

// Custom hook to use the ActiveRoleContext
export const useActiveRole = (): ActiveRoleContextType => {
    const context = useContext(ActiveRoleContext);
    if (!context) {
        throw new Error("useActiveRole must be used within an ActiveRoleProvider");
    }
    return context;
};

// Context provider component props
interface ActiveRoleProviderProps {
    children: ReactNode;
}

// Provider component
export const ActiveRoleProvider: React.FC<ActiveRoleProviderProps> = ({ children }) => {
    const auth = useAuth();
    const [activeRole, setActiveRoleState] = useState<USER_TYPE | null>(null);
    const [availableRoles, setAvailableRoles] = useState<USER_TYPE[]>([]);

    // Load active role from localStorage on mount
    useEffect(() => {
        const storedRole = localStorage.getItem('smsp_active_role') as USER_TYPE;
        console.log("[USERTYPE] Loading stored role from localStorage:", storedRole);
        if (storedRole) {
            setActiveRoleState(storedRole);
        }
    }, []);

    // Update available roles when user changes
    useEffect(() => {
        console.log("[USERTYPE] Auth data changed:", auth?.data?.user);
        if (auth?.data?.user) {
            const user = auth.data.user;
            const roles: USER_TYPE[] = [];

            console.log("[USERTYPE] User groups:", user.groups);
            console.log("[USERTYPE] User is_staff:", user.is_staff);

            // Use Django groups directly as USER_TYPE values
            if (user.groups && Array.isArray(user.groups)) {
                user.groups.forEach((group: USER_TYPE) => {
                    // Groups directly match USER_TYPE values
                    if (group === 'athlete' || group === 'parent' || group === 'coach' || group === 'admin' || group === 'agent') {
                        roles.push(group as USER_TYPE);
                    }
                });
            }

            // Check if user is staff (admin) - fallback for admin access
            if (user.is_staff && !roles.includes('admin')) {
                console.log("[USERTYPE] Adding admin role due to is_staff flag");
                roles.push('admin');
            }

            console.log("[USERTYPE] Available roles determined:", roles);
            setAvailableRoles(roles);

            // If no active role is set or current active role is not available, set to first available role
            if (!activeRole || !roles.includes(activeRole)) {
                if (roles.length > 0) {
                    console.log("[USERTYPE] Setting active role to first available:", roles[0]);
                    setActiveRoleState(roles[0]);
                    localStorage.setItem('smsp_active_role', roles[0]);
                } else {
                    console.log("[USERTYPE] No roles available, clearing active role");
                    setActiveRoleState(null);
                    localStorage.removeItem('smsp_active_role');
                }
            } else {
                console.log("[USERTYPE] Current active role is valid:", activeRole);
            }
        } else {
            console.log("[USERTYPE] No user data, clearing roles");
            // User not authenticated, clear roles
            setAvailableRoles([]);
            setActiveRoleState(null);
            localStorage.removeItem('smsp_active_role');
        }
    }, [auth?.data?.user, activeRole]);

    // Function to set active role
    const setActiveRole = (role: USER_TYPE) => {
        console.log("[USERTYPE] Attempting to set active role:", role);
        console.log("[USERTYPE] Available roles:", availableRoles);
        if (availableRoles.includes(role)) {
            console.log("[USERTYPE] Role switch successful, updating state and localStorage");
            setActiveRoleState(role);
            localStorage.setItem('smsp_active_role', role);
        } else {
            console.log("[USERTYPE] Role switch failed - role not in available roles");
        }
    };

    // Function to check if user has a specific role
    const hasRole = (role: USER_TYPE): boolean => {
        return availableRoles.includes(role);
    };

    // Function to check if user can access routes requiring specific roles
    const canAccess = (requiredRoles: USER_TYPE[]): boolean => {
        return requiredRoles.some(role => availableRoles.includes(role));
    };

    return (
        <ActiveRoleContext.Provider
            value={{
                activeRole,
                availableRoles,
                setActiveRole,
                hasRole,
                canAccess
            }}
        >
            {children}
        </ActiveRoleContext.Provider>
    );
};
