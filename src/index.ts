export type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R
export type EventTarget2State = number | string | symbol

export type EventMap = Record<string, CustomEvent>
type _EventMapKey<EventMap> = Extract<keyof EventMap, string>
export type EventMapKey<EventMap> = (_EventMapKey<EventMap> extends never ? string : _EventMapKey<EventMap>)

export class EventTarget2<E extends EventMap = {}, K extends string = EventMapKey<E>> extends EventTarget {
    parent?: EventTarget2;
    state?: EventTarget2State
    listeners: Map<string, Set<EventListener2>> = new Map()

    async waitFor<T>(type: K, compareValue?: T): Promise<T> {
        return new Promise((resolve) => {
            if (compareValue !== undefined) {
                this.listenOnceOnly<T, void>(type, (e) => resolve(e.detail), (e) => e.detail === compareValue)
            } else {
                this.listenOnce<T, void>(type, (e) => resolve(e.detail))
            }
        });
    }

    callback<T>(type: K, callback: (result?: T) => void) {
        this.waitFor<T>(type).then(callback);
    }

    dispatch<T = EventMap[K]["detail"]>(type: K, detail?: T) {
        this.dispatchEvent(new CustomEvent(type, detail !== undefined ? { detail } : undefined));
    }

    listen<T, R = void>(type: K, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.add(callback)
        this.addEventListener(type, callback as unknown as EventListener, options);
    }

    remove<T, R = void>(type: K, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.delete(callback)
        this.removeEventListener(type, callback as unknown as EventListener, options);
    }

    destroy() {
        for (let type of this.listeners.keys()) {
            for (let callback of this.listeners.get(type)!) {
                this.remove(type as K, callback)
            }
        }
    }

    listenOnce<T, R = void>(type: K, callback: EventListener2<T, R>) {
        this.listen<T, R>(type, callback, { once: true });
    }

    listenOnceOnly<T, R = void>(type: K, callback: EventListener2<T, R>, only: EventListener2<T, boolean>) {
        const wrapper = (e: CustomEvent<T>) => {
            if (only(e)) {
                this.remove(type, wrapper)
                callback(e)
            }
        }
        this.listen<T, void>(type, wrapper)
    }

    listenWhile<T, R = void>(type: K, callback: EventListener2<T, R>, whileFunc: EventListener2<T, boolean>) {
        const wrapper = (e: CustomEvent<T>) => {
            callback(e)
            if (!whileFunc(e)) {
                this.remove(type, wrapper)
            }
        }
        this.listen<T, void>(type, wrapper)
    }

    listenDebounce<T, R = void>(type: K, callback: EventListener2<T, R>, options: { timeout: number, mode: "first" | "last" } & AddEventListenerOptions = { timeout: 100, mode: "last" }) {
        switch (options.mode) {
            case "first": return this.listenDebounceFirst<T, R>(type, callback, options);
            case "last": return this.listenDebounceLast<T, R>(type, callback, options);
        }
    }

    listenDebounceFirst<T, R = void>(type: K, callback: EventListener2<T, R>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
        let lastMs = 0
        this.listen<T, void>(
            type,
            (e: CustomEvent<T>) => {
                const currentMs = Date.now()
                if (currentMs - lastMs > options.timeout) {
                    callback(e)
                }
                lastMs = currentMs
            },
            options
        )
    }

    listenDebounceLast<T, R = void>(type: K, callback: EventListener2<T, R>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
        let timoutInstance: number;
        this.listen<T, void>(
            type,
            (e: CustomEvent<T>) => {
                clearTimeout(timoutInstance);
                timoutInstance = window.setTimeout(() => callback(e), options.timeout);
            },
            options
        );
    }

    static race<T, R = void>(targets: Array<EventTarget2>, type: string, callback: EventListener2<T, R>) {
        let fired = false
        const wrapper = (e: CustomEvent<T>) => {
            if (!fired) {
                fired = true
                callback(e)
                for (let target of targets) {
                    target.remove(type, wrapper)
                }
            }
        }
        for (let target of targets) {
            target.listenOnce(type, wrapper)
        }
    }

    protected _bubbleMap: Map<string, EventListener2> = new Map()
    enableBubble(type: K, parentFunc?: () => EventTarget2 | undefined) {
        if (this._bubbleMap.has(type)) return;
        const dispatcher = (e: CustomEvent) => {
            const parent = parentFunc ? parentFunc() : this.parent
            parent?.dispatch(e.type, e.detail);
        }
        this.listen(type, dispatcher);
        this._bubbleMap.set(type, dispatcher)
    }
    disableBubble(type: K) {
        if (!this._bubbleMap.has(type)) return;
        const dispatcher = this._bubbleMap.get(type)!
        this.remove(type, dispatcher)
        this._bubbleMap.delete(type)
    }

    protected atomicQueue: Map<string, Array<() => PromiseLike<any> | any>> = new Map()
    _atomicInit(type: K) {
        this.atomicQueue.set(type, []);
        const atomicLoop = async () => {
            const queue = this.atomicQueue.get(type)!
            while (true) {
                const task = queue.shift()
                if (task) {
                    await task()
                } else {
                    await this.waitFor("__atomic-add" as any, type);
                }
            }
        }
        atomicLoop()
    }
    atomic<T>(type: K, func: () => PromiseLike<T> | T) {
        return new Promise<T>((resolve) => {
            const wrap = async () => resolve(await func())
            if (!this.atomicQueue.has(type)) this._atomicInit(type);
            this.atomicQueue.get(type)!.push(wrap)
            this.dispatch("__atomic-add" as any, type)
        })
    }
}