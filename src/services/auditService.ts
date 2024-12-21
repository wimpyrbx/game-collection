import { supabase } from '../lib/supabaseMonitor'
import type { AuditLogChanges, FieldChange } from '../types/audit'

export class AuditService {
    /**
     * Compare two values and return a FieldChange if they're different
     * Returns null if the values are the same
     */
    private static compareValues<T>(oldValue: T | null, newValue: T | null, field?: string): FieldChange<T> | null {
        // If both values are arrays, compare them properly
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            // For types, compare by id and proxy_type
            if (field === 'types') {
                const oldTypes = new Set(oldValue.map((item: any) => 
                    `${item.type_id || item.type?.id}_${item.proxy_type}`
                ))
                const newTypes = new Set(newValue.map((item: any) => 
                    `${item.type_id || item.type?.id}_${item.proxy_type}`
                ))
                
                if (oldTypes.size === newTypes.size && 
                    [...oldTypes].every(type => newTypes.has(type))) {
                    return null
                }
            }
            // For tags, compare just by id
            else if (field === 'tags') {
                const oldIds = new Set(oldValue.map((item: any) => item.id || item.tag?.id))
                const newIds = new Set(newValue.map((item: any) => item.id || item.tag?.id))

                if (oldIds.size === newIds.size && 
                    [...oldIds].every(id => newIds.has(id))) {
                    return null
                }
            }
            // For other arrays, sort and compare
            else {
                const oldSorted = [...oldValue].sort()
                const newSorted = [...newValue].sort()
                if (JSON.stringify(oldSorted) === JSON.stringify(newSorted)) {
                    return null
                }
            }
        }
        // For non-array values, do a simple comparison
        else if (oldValue === newValue) {
            return null
        }

        return {
            from: oldValue,
            to: newValue
        }
    }

    /**
     * Detect changes between old and new state of a miniature
     * Returns null if no changes are detected
     */
    private static detectChanges(oldState: any, newState: any): AuditLogChanges | null {
        const changes: AuditLogChanges = {}
        let hasChanges = false

        // Define fields to check
        const fieldsToCheck = [
            'name',
            'description',
            'base_size_id',
            'product_set_id',
            'location',
            'quantity',
            'types',
            'tags',
            'painted_by_id',
            'in_use'
        ] as const

        for (const field of fieldsToCheck) {
            const change = this.compareValues(oldState[field], newState[field], field)
            if (change) {
                changes[field as keyof AuditLogChanges] = change
                hasChanges = true
            }
        }

        return hasChanges ? changes : null
    }

    /**
     * Create an audit log entry for a miniature creation
     */
    static async logMiniatureCreate(userId: string, miniatureData: any): Promise<void> {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                miniature_id: miniatureData.id,
                action_type: 'MINIATURE_CREATE',
                changes: null,
                metadata: {
                    miniature: miniatureData
                }
            })

        if (error) {
            console.error('Error creating audit log:', error)
        }
    }

    /**
     * Create an audit log entry for a miniature update
     * Only creates a log if there are actual changes
     */
    static async logMiniatureUpdate(
        userId: string,
        miniatureId: number,
        oldState: any,
        newState: any
    ): Promise<void> {
        const changes = this.detectChanges(oldState, newState)
        
        // If no changes detected, don't create a log
        if (!changes) {
            return
        }

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                miniature_id: miniatureId,
                action_type: 'MINIATURE_UPDATE',
                changes,
                metadata: {
                    miniature: oldState,
                    related_data: {
                        types: oldState.types,
                        categories: oldState.categories
                    }
                }
            })

        if (error) {
            console.error('Error creating audit log:', error)
        }
    }

    /**
     * Create an audit log entry for a miniature deletion
     */
    static async logMiniatureDelete(
        userId: string,
        miniatureId: number,
        miniatureData: any
    ): Promise<void> {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                miniature_id: miniatureId,
                action_type: 'MINIATURE_DELETE',
                changes: null,
                metadata: {
                    miniature: miniatureData,
                    related_data: {
                        types: miniatureData.types,
                        categories: miniatureData.categories
                    }
                }
            })

        if (error) {
            console.error('Error creating audit log:', error)
        }
    }

    /**
     * Create an audit log entry for image operations
     */
    static async logImageOperation(
        userId: string,
        miniatureId: number,
        action: 'IMAGE_UPLOAD' | 'IMAGE_REPLACE' | 'IMAGE_DELETE',
        newImageUrl?: string,
        oldImageUrl?: string
    ): Promise<void> {
        const changes = {
            image: {
                from: action === 'IMAGE_DELETE' ? oldImageUrl :
                     action === 'IMAGE_REPLACE' ? oldImageUrl : null,
                to: (action === 'IMAGE_UPLOAD' || action === 'IMAGE_REPLACE') ? newImageUrl : null
            }
        }

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                miniature_id: miniatureId,
                action_type: action,
                changes,
                metadata: {
                    old_image_url: oldImageUrl,
                    new_image_url: newImageUrl
                }
            })

        if (error) {
            console.error('Error creating audit log:', error)
        }
    }

    /**
     * Create an audit log entry for type assignments
     */
    static async logTypeAssignment(
        userId: string,
        miniatureId: number,
        action: 'TYPE_ASSIGN' | 'TYPE_UNASSIGN',
        typeId: number,
        typeName: string
    ): Promise<void> {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                miniature_id: miniatureId,
                action_type: action,
                changes: {
                    types: {
                        from: action === 'TYPE_UNASSIGN' ? [typeId] : null,
                        to: action === 'TYPE_ASSIGN' ? [typeId] : null
                    }
                },
                metadata: {
                    type: { id: typeId, name: typeName }
                }
            })

        if (error) {
            console.error('Error creating audit log:', error)
        }
    }
} 