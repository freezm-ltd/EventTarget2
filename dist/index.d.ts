export type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R;
export type EventTarget2State = number | string | symbol;
export type EventMap = Record<string, CustomEvent>;
export type EventMapKey<E extends EventMap> = keyof E extends never ? string : Extract<keyof E, string>;
export type Detail<E extends EventMap, K extends keyof E> = E[K]["detail"];
export type EventHandlerMap<M extends EventMap> = {
    [K in keyof M]: EventListener2<M[K]["detail"]>;
};
export declare class EventTarget2<E extends EventMap = {}, K extends string = EventMapKey<E>> extends EventTarget {
    parent?: EventTarget2<E, K>;
    state?: EventTarget2State;
    listeners: Map<string, Set<EventListener2>>;
    waitFor<P extends K, T extends Detail<E, P>>(type: P, compareValue?: T): Promise<T>;
    callback<P extends K, T extends Detail<E, P>>(type: P, callback: (result?: T) => void): void;
    dispatch<P extends K, T extends Detail<E, P>>(type: P, detail?: T): void;
    listen<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: boolean | AddEventListenerOptions | undefined): void;
    remove<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: boolean | AddEventListenerOptions | undefined): void;
    destroy(): void;
    listenOnce<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>): void;
    listenOnceOnly<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, only: EventListener2<T, boolean>): void;
    listenWhile<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, whileFunc: EventListener2<T, boolean>): void;
    listenDebounce<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: {
        timeout: number;
        mode: "first" | "last";
    } & AddEventListenerOptions): void;
    listenDebounceFirst<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    listenDebounceLast<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    static race<T>(targets: Array<EventTarget2>, type: string, callback: EventListener2<T>): void;
    protected _bubbleMap: Map<string, EventListener2>;
    enableBubble(type: K, parentFunc?: () => EventTarget2 | undefined): void;
    disableBubble(type: K): void;
    protected atomicQueue: Map<string, Array<() => PromiseLike<any> | any>>;
    _atomicInit(type: K): void;
    atomic<T>(type: K, func: () => PromiseLike<T> | T): Promise<T>;
    bulkListen(handlerMap: Partial<EventHandlerMap<E>>): void;
    bulkRemove(handlerMap: Partial<EventHandlerMap<E>>): void;
}
