import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "../allauth/auth/hooks";
import ApiClient, { HttpResponse } from "../config/ApiClient";
import { ContextApiResponse, OrganizationPublicData, UserOrganizationMembership } from "../object-actions/types/types";

interface AppContextType {
    organization: OrganizationPublicData | null;
    membership: UserOrganizationMembership | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within AppContextProvider");
    }
    return context;
}

interface Props {
    children: ReactNode;
}

export function AppContextProvider({ children }: Props) {
    const [organization, setOrganization] = useState<OrganizationPublicData | null>(null);
    const [membership, setMembership] = useState<UserOrganizationMembership | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const auth = useAuth();

    const fetchContext = async () => {
        setLoading(true);
        setError(null);
        try {
            const response: HttpResponse<ContextApiResponse> = await ApiClient.get('/api/context/current');
            if (response.success && response.data) {
                setOrganization(response.data.organization);
                setMembership(response.data.membership);
            } else {
                setError(response.error || "Failed to load context");
            }
        } catch (err) {
            setError("Failed to load application context");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch context on mount
    useEffect(() => {
        fetchContext();
    }, []);

    // Refresh context when user logs in, clear when user logs out
    useEffect(() => {
        if (auth?.meta?.is_authenticated) {
            console.log("[CONTEXT] User authenticated, refreshing context");
            fetchContext();
        } else if (auth && !auth.meta?.is_authenticated) {
            console.log("[CONTEXT] User logged out, clearing context");
            setOrganization(null);
            setMembership(null);
            setError(null);
            setLoading(false);
        }
    }, [auth?.meta?.is_authenticated]);

    // Debug logging for context changes
    useEffect(() => {
        console.log("[CONTEXT] Context state updated:", {
            organization: organization?.name || "None",
            membership: membership?.roles?.join(", ") || "None",
            loading,
            error
        });
    }, [organization, membership, loading, error]);

    const value: AppContextType = {
        organization,
        membership,
        loading,
        error,
        refresh: fetchContext
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
