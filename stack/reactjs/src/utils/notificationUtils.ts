export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'urgent': return 'error';
        case 'high': return 'warning';
        case 'normal': return 'primary';
        case 'low': return 'default';
        default: return 'default';
    }
};

export const getPriorityLabel = (priority: string) => {
    switch (priority) {
        case 'urgent': return 'Urgent';
        case 'high': return 'High';
        case 'normal': return 'Normal';
        case 'low': return 'Low';
        default: return 'Normal';
    }
};

export const getDeliveryStatusColor = (status: string) => {
    switch (status) {
        case 'delivered': return 'success';
        case 'sent': return 'info';
        case 'pending': return 'warning';
        case 'failed': return 'error';
        case 'bounced': return 'error';
        default: return 'default';
    }
};

export const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
};

export const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
};

export const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
};
