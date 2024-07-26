export type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R
export type EventTarget2State = number | string | symbol

export class EventTarget2 extends EventTarget {
    parent?: EventTarget2;
    state?: EventTarget2State
    listeners: Map<string, Set<EventListener2>> = new Map()

    async waitFor<T>(type: string, compareValue?: T): Promise<T> {
        return new Promise((resolve) => {
            if (compareValue !== undefined) {
                this.listenOnceOnly<T, void>(type, (e) => resolve(e.detail), (e) => e.detail === compareValue)
            } else {
                this.listenOnce<T, void>(type, (e) => resolve(e.detail))
            }
        });
    }

    callback<T>(type: string, callback: (result?: T) => void) {
        this.waitFor<T>(type).then(callback);
    }

    dispatch<T>(type: string, detail?: T) {
        this.dispatchEvent(new CustomEvent(type, detail !== undefined ? { detail } : undefined));
    }

    listen<T, R = void>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.add(callback)
        this.addEventListener(type, callback as unknown as EventListener, options);
    }

    remove<T, R = void>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.delete(callback)
        this.removeEventListener(type, callback as unknown as EventListener, options);
    }

    destroy() {
        for (let type of this.listeners.keys()) {
            for (let callback of this.listeners.get(type)!) {
                this.remove(type, callback)
            }
        }
    }

    listenOnce<T, R = void>(type: string, callback: EventListener2<T, R>) {
        this.listen<T, R>(type, callback, { once: true });
    }

    listenOnceOnly<T, R = void>(type: string, callback: EventListener2<T, R>, only: EventListener2<T, boolean>) {
        const wrapper = (e: CustomEvent<T>) => {
            if (only(e)) {
                this.remove(type, wrapper)
                callback(e)
            }
        }
        this.listen<T, void>(type, wrapper)
    }

    listenDebounce<T, R = void>(type: string, callback: EventListener2<T, R>, options: { timeout: number, mode: "first" | "last" } & AddEventListenerOptions = { timeout: 100, mode: "last" }) {
        switch (options.mode) {
            case "first": return this.listenDebounceFirst<T, R>(type, callback, options);
            case "last": return this.listenDebounceLast<T, R>(type, callback, options);
        }
    }

    listenDebounceFirst<T, R = void>(type: string, callback: EventListener2<T, R>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
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

    listenDebounceLast<T, R = void>(type: string, callback: EventListener2<T, R>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
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

    protected _bubbleMap: Map<string, EventListener2> = new Map()
    enableBubble(type: string) {
        if (this._bubbleMap.has(type)) return;
        const dispatcher = (e: CustomEvent) => {
            this.parent?.dispatch(e.type, e.detail);
        }
        this.listen(type, dispatcher);
        this._bubbleMap.set(type, dispatcher)
    }
    disableBubble(type: string) {
        if (!this._bubbleMap.has(type)) return;
        const dispatcher = this._bubbleMap.get(type)!
        this.remove(type, dispatcher)
        this._bubbleMap.delete(type)
    }

    protected atomicQueue: Map<string, Array<() => PromiseLike<any> | any>> = new Map()
    _atomicInit(type: string) {
        this.atomicQueue.set(type, []);
        const atomicLoop = async () => {
            const queue = this.atomicQueue.get(type)!
            while (true) {
                const task = queue.shift()
                if (task) {
                    await task()
                } else {
                    await this.waitFor("__atomic-add", type);
                }
            }
        }
        atomicLoop()
    }
    atomic(type: string, func: () => PromiseLike<any> | any) {
        return new Promise((resolve) => {
            const wrap = async () => resolve(await func())
            if (!this.atomicQueue.has(type)) this._atomicInit(type);
            this.atomicQueue.get(type)!.push(wrap)
            this.dispatch("__atomic-add", type)
        })
    }
}