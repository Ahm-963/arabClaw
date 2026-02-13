declare module 'screenshot-desktop' {
    export function listDisplays(): Promise<any[]>
    export default function (options?: { format?: string }): Promise<Buffer>
}
