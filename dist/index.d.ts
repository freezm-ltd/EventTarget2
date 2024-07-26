export type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R;
export type EventTarget2State = number | string | symbol;
export declare class EventTarget2 extends EventTarget {
    parent?: EventTarget2;
    state?: EventTarget2State;
    listeners: Map<string, Set<EventListener2>>;
    waitFor<T>(type: string, compareValue?: T): Promise<T>;
    callback<T>(type: string, callback: (result?: T) => void): void;
    dispatch<T>(type: string, detail?: T): void;
    listen<T, R = void>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined): void;
    remove<T, R = void>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined): void;
    destroy(): void;
    listenOnce<T, R = void>(type: string, callback: EventListener2<T, R>): void;
    listenOnceOnly<T, R = void>(type: string, callback: EventListener2<T, R>, only: EventListener2<T, boolean>): void;
    listenDebounce<T, R = void>(type: string, callback: EventListener2<T, R>, options?: {
        timeout: number;
        mode: "first" | "last";
    } & AddEventListenerOptions): void;
    listenDebounceFirst<T, R = void>(type: string, callback: EventListener2<T, R>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    listenDebounceLast<T, R = void>(type: string, callback: EventListener2<T, R>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    protected _bubbleMap: Map<string, EventListener2>;
    enableBubble(type: string): void;
    disableBubble(type: string): void;
    protected atomicQueue: Map<string, Array<() => PromiseLike<any> | any>>;
    _atomicInit(type: string): void;
    atomic(type: string, func: () => PromiseLike<any> | any): Promise<unknown>;
}
