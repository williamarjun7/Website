import { useState, useEffect, type ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { type Resource, type Action, type Role } from '../../services/rbacService';

interface PermissionGuardProps {
    resource?: Resource;
    action?: Action;
    roles?: Role[];
    fallback?: ReactNode;
    children: ReactNode;
}

export const PermissionGuard = ({ resource, action, roles, fallback = null, children }: PermissionGuardProps) => {
    const { can, hasAnyRole, profile } = usePermission();
    const [hasAccess, setHasAccess] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const check = async () => {
            if (roles) {
                setHasAccess(hasAnyRole(...roles));
                setChecking(false);
                return;
            }
            if (resource && action) {
                const result = await can(resource, action);
                setHasAccess(result);
                setChecking(false);
                return;
            }
            setHasAccess(!!profile);
            setChecking(false);
        };
        check();
    }, [resource, action, roles, can, hasAnyRole, profile]);

    if (checking) return null;
    if (!hasAccess) return <>{fallback}</>;
    return <>{children}</>;
};

interface PermissionButtonProps {
    resource: Resource;
    action: Action;
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}

export const PermissionButton = ({ resource, action, children, onClick, disabled, className }: PermissionButtonProps) => {
    const { can } = usePermission();
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        can(resource, action).then(setHasAccess);
    }, [resource, action, can]);

    if (!hasAccess) return null;
    return (
        <button onClick={onClick} disabled={disabled} className={className}>
            {children}
        </button>
    );
};

interface PermissionLinkProps {
    resource: Resource;
    action: Action;
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}

export const PermissionLink = ({ resource, action, children, onClick, className }: PermissionLinkProps) => {
    const { can } = usePermission();
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        can(resource, action).then(setHasAccess);
    }, [resource, action, can]);

    if (!hasAccess) return null;
    return (
        <button onClick={onClick} className={className}>
            {children}
        </button>
    );
};
