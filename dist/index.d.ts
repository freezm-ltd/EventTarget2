type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R;
type EventTarget2State = number | string | symbol;
export declare class EventTarget2 extends EventTarget {
    parent?: EventTarget2;
    state?: EventTarget2State;
    listeners: Map<string, Set<EventListener2>>;
    waitFor(type: string): Promise<unknown>;
    callback<T>(type: string, callback: (result?: T) => void): void;
    dispatch<T>(type: string, detail?: T): void;
    listen<T, R>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined): void;
    remove<T, R>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined): void;
    destroy(): void;
    listenOnce<T, R>(type: string, callback: EventListener2<T, R>): void;
    listenOnceOnly<T, R>(type: string, callback: EventListener2<T, R>, only: EventListener2<T, boolean>): void;
    listenDebounce<T, R>(type: string, callback: EventListener2<T, R>, options?: {
        timeout: number;
        mode: "first" | "last";
    } & AddEventListenerOptions): void;
    listenDebounceFirst<T, R>(type: string, callback: EventListener2<T, R>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    listenDebounceLast<T, R>(type: string, callback: EventListener2<T, R>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    protected _bubbleMap: Map<string, EventListener2>;
    enableBubble(type: string): void;
    disableBubble(type: string): void;
}
export declare function atomicDo(func: () => PromiseLike<any> | any, target: EventTarget2, state?: number | string | symbol, endEvent?: string): Promise<void>;
export {};
