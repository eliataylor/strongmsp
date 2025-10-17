import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import ApiClient, { HttpResponse } from "../config/ApiClient";
import { ContextApiResponse, OrganizationPublicData, UserOrganizationMembership, UserPaymentAssignment } from "../object-actions/types/types";

interface AppContextType {
    organization: OrganizationPublicData | null;
    membership: UserOrganizationMembership | null;
    paymentAssignments: UserPaymentAssignment[];
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
    const [paymentAssignments, setPaymentAssignments] = useState<UserPaymentAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContext = async () => {
        setLoading(true);
        setError(null);
        try {
            const response: HttpResponse<ContextApiResponse> = await ApiClient.get('/api/context/current');
            if (response.success && response.data) {
                setOrganization(response.data.organization);
                setMembership(response.data.membership);
                setPaymentAssignments(response.data.payment_assignments || []);
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

    useEffect(() => {
        fetchContext();
    }, []);

    const value: AppContextType = {
        organization,
        membership,
        paymentAssignments,
        loading,
        error,
        refresh: fetchContext
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
