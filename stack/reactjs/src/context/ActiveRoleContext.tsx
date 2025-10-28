import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "../allauth/auth";
import { USER_TYPE } from "../object-actions/types/types";
import { useAppContext } from "./AppContext";

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
    const appContext = useAppContext();
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

    // Update available roles when membership changes
    useEffect(() => {
        console.log("[USERTYPE] Membership changed:", appContext?.membership);
        console.log("[USERTYPE] Auth meta is_authenticated:", auth?.meta?.is_authenticated);

        if (auth?.meta?.is_authenticated && appContext?.membership?.roles) {
            const roles: USER_TYPE[] = appContext.membership.roles;

            console.log("[USERTYPE] Available roles from membership:", roles);
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
            console.log("[USERTYPE] No membership or not authenticated, clearing roles");
            // User not authenticated, clear roles
            setAvailableRoles([]);
            setActiveRoleState(null);
            localStorage.removeItem('smsp_active_role');
        }
    }, [appContext?.membership, auth?.meta?.is_authenticated, activeRole]);

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
