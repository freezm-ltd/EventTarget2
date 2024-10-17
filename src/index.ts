export type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R
export type EventTarget2State = number | string | symbol

export type EventMap = Record<string, CustomEvent>
export type EventMapKey<E extends EventMap> = keyof E extends never ? string : Extract<keyof E, string>
export type Detail<E extends EventMap, K extends keyof E> = E[K]["detail"]
export type EventHandlerMap<M extends EventMap> = { [K in keyof M]: EventListener2<M[K]["detail"]> }

export class EventTarget2<E extends EventMap = {}, K extends string = EventMapKey<E>> extends EventTarget {
    parent?: EventTarget2<E, K>;
    state?: EventTarget2State
    listeners: Map<string, Set<EventListener2>> = new Map()

    async waitFor<P extends K, T extends Detail<E, P>>(type: P, compareValue?: T): Promise<T> {
        return new Promise((resolve) => {
            if (compareValue !== undefined) {
                this.listenOnceOnly(type, (e) => resolve(e.detail), (e) => e.detail === compareValue)
            } else {
                this.listenOnce(type, (e) => resolve(e.detail))
            }
        });
    }

    callback<P extends K, T extends Detail<E, P>>(type: P, callback: (result?: T) => void) {
        this.waitFor(type).then(callback);
    }

    dispatch<P extends K, T extends Detail<E, P>>(type: P, detail?: T) {
        this.dispatchEvent(new CustomEvent(type, detail !== undefined ? { detail } : undefined));
    }

    listen<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: boolean | AddEventListenerOptions | undefined) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.add(callback)
        this.addEventListener(type, callback as unknown as EventListener, options);
    }

    remove<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options?: boolean | AddEventListenerOptions | undefined) {
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

    listenOnce<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>) {
        this.listen(type, callback, { once: true });
    }

    listenOnceOnly<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, only: EventListener2<T, boolean>) {
        const wrapper = (e: CustomEvent<T>) => {
            if (only(e)) {
                this.remove(type, wrapper)
                callback(e)
            }
        }
        this.listen(type, wrapper)
    }

    listenWhile<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, whileFunc: EventListener2<T, boolean>) {
        const wrapper = (e: CustomEvent<T>) => {
            callback(e)
            if (!whileFunc(e)) {
                this.remove(type, wrapper)
            }
        }
        this.listen(type, wrapper)
    }

    listenDebounce<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options: { timeout: number, mode: "first" | "last" } & AddEventListenerOptions = { timeout: 100, mode: "last" }) {
        switch (options.mode) {
            case "first": return this.listenDebounceFirst(type, callback, options);
            case "last": return this.listenDebounceLast(type, callback, options);
        }
    }

    listenDebounceFirst<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
        let lastMs = 0
        this.listen(
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

    listenDebounceLast<P extends K, T extends Detail<E, P>>(type: P, callback: EventListener2<T>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
        let timoutInstance: number;
        this.listen(
            type,
            (e: CustomEvent<T>) => {
                clearTimeout(timoutInstance);
                timoutInstance = window.setTimeout(() => callback(e), options.timeout);
            },
            options
        );
    }

    static race<T>(targets: Array<EventTarget2>, type: string, callback: EventListener2<T>) {
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
        const dispatcher = (e: CustomEvent<Detail<E, K>>) => {
            const parent = parentFunc ? parentFunc() : this.parent
            parent?.dispatch(e.type as any, e.detail);
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
                    await this.waitFor("__atomic-add" as any, type as any);
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
            this.dispatch("__atomic-add" as any, type as any)
        })
    }

    bulkListen(handlerMap: Partial<EventHandlerMap<E>>) {
        for (let type in handlerMap) {
            const handler = handlerMap[type]
            if (handler) this.listen(type as unknown as K, handler)
        }
    }

    bulkRemove(handlerMap: Partial<EventHandlerMap<E>>) {
        for (let type in handlerMap) {
            const handler = handlerMap[type]
            if (handler) this.remove(type as unknown as K, handler)
        }
    }
}