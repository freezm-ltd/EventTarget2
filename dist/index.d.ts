export type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R;
export type EventTarget2State = number | string | symbol;
export type EventMap = Record<string, CustomEvent>;
type _EventMapKey<EventMap> = Extract<keyof EventMap, string>;
export type EventMapKey<EventMap> = (_EventMapKey<EventMap> extends never ? string : _EventMapKey<EventMap>);
export declare class EventTarget2<E extends EventMap = {}, K extends string = EventMapKey<E>> extends EventTarget {
    parent?: EventTarget2;
    state?: EventTarget2State;
    listeners: Map<string, Set<EventListener2>>;
    waitFor<T>(type: K, compareValue?: T): Promise<T>;
    callback<T>(type: K, callback: (result?: T) => void): void;
    dispatch<T = EventMap[K]["detail"]>(type: K, detail?: T): void;
    listen<T, R = void>(type: K, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined): void;
    remove<T, R = void>(type: K, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined): void;
    destroy(): void;
    listenOnce<T, R = void>(type: K, callback: EventListener2<T, R>): void;
    listenOnceOnly<T, R = void>(type: K, callback: EventListener2<T, R>, only: EventListener2<T, boolean>): void;
    listenWhile<T, R = void>(type: K, callback: EventListener2<T, R>, whileFunc: EventListener2<T, boolean>): void;
    listenDebounce<T, R = void>(type: K, callback: EventListener2<T, R>, options?: {
        timeout: number;
        mode: "first" | "last";
    } & AddEventListenerOptions): void;
    listenDebounceFirst<T, R = void>(type: K, callback: EventListener2<T, R>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    listenDebounceLast<T, R = void>(type: K, callback: EventListener2<T, R>, options?: {
        timeout: number;
    } & AddEventListenerOptions): void;
    static race<T, R = void>(targets: Array<EventTarget2>, type: string, callback: EventListener2<T, R>): void;
    protected _bubbleMap: Map<string, EventListener2>;
    enableBubble(type: K, parentFunc?: () => EventTarget2 | undefined): void;
    disableBubble(type: K): void;
    protected atomicQueue: Map<string, Array<() => PromiseLike<any> | any>>;
    _atomicInit(type: K): void;
    atomic<T>(type: K, func: () => PromiseLike<T> | T): Promise<T>;
}
export {};
