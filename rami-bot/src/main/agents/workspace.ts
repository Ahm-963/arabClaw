import { EventEmitter } from 'events'

export interface WorkspaceItem {
    id: string
    type: 'text' | 'code' | 'file' | 'memory'
    content: any
    metadata: Record<string, any>
    createdBy: string
    createdAt: number
}

export class SharedWorkspace extends EventEmitter {
    private items: Map<string, WorkspaceItem> = new Map()

    addItem(type: WorkspaceItem['type'], content: any, metadata: Record<string, any> = {}, createdBy: string = 'system'): string {
        const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const item: WorkspaceItem = {
            id,
            type,
            content,
            metadata,
            createdBy,
            createdAt: Date.now()
        }

        this.items.set(id, item)
        this.emit('item:added', item)
        return id
    }

    getItem(id: string): WorkspaceItem | undefined {
        return this.items.get(id)
    }

    getItemsByType(type: WorkspaceItem['type']): WorkspaceItem[] {
        return Array.from(this.items.values()).filter(i => i.type === type)
    }

    updateItem(id: string, content: any): boolean {
        const item = this.items.get(id)
        if (!item) return false

        item.content = content
        this.emit('item:updated', item)
        return true
    }

    deleteItem(id: string): boolean {
        if (this.items.delete(id)) {
            this.emit('item:deleted', id)
            return true
        }
        return false
    }

    clear(): void {
        this.items.clear()
        this.emit('workspace:cleared')
    }
}

export const sharedWorkspace = new SharedWorkspace()
