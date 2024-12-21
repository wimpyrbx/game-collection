export type AuditActionType = 
    | 'MINIATURE_CREATE'
    | 'MINIATURE_UPDATE'
    | 'MINIATURE_DELETE'
    | 'IMAGE_UPLOAD'
    | 'IMAGE_REPLACE'
    | 'IMAGE_DELETE'
    | 'TYPE_ASSIGN'
    | 'TYPE_UNASSIGN'
    | 'TAG_ASSIGN'
    | 'TAG_UNASSIGN';

export interface FieldChange<T> {
    from: T | null;
    to: T | null;
}

export interface AuditLogChanges {
    name?: FieldChange<string>;
    description?: FieldChange<string>;
    base_size_id?: FieldChange<number>;
    product_set_id?: FieldChange<number>;
    location?: FieldChange<string>;
    quantity?: FieldChange<number>;
    types?: FieldChange<any[]>;
    tags?: FieldChange<any[]>;
    image?: FieldChange<string>;
    painted_by_id?: FieldChange<number>;
}

export interface Profile {
    id: string;
    email: string;
}

export interface AuditLog {
    id: number;
    user_id: string;
    miniature_id: number;
    action_type: string;
    changes: any;
    metadata: any;
    created_at: string;
    operation_id: string;
    user?: Profile;
    miniature?: {
        id: number;
        name: string;
    };
} 