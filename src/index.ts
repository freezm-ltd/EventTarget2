type EventListener2<T = any, R = any> = (evt: CustomEvent<T>) => R
type EventTarget2State = number | string | symbol

export class EventTarget2 extends EventTarget {
    parent?: EventTarget2;
    state?: EventTarget2State
    listeners: Map<string, Set<EventListener2>> = new Map()

    async waitFor(type: string) {
        return new Promise((resolve) => {
            this.addEventListener(type, resolve, { once: true });
        });
    }

    callback<T>(type: string, callback: (result?: T) => void) {
        this.waitFor(type).then((result) => callback(result as T));
    }

    dispatch<T>(type: string, detail?: T) {
        this.dispatchEvent(new CustomEvent(type, detail ? { detail } : undefined));
    }

    listen<T, R>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.add(callback)
        this.addEventListener(type, callback as unknown as EventListener, options);
    }

    remove<T, R>(type: string, callback: EventListener2<T, R>, options?: boolean | AddEventListenerOptions | undefined) {
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

    listenOnce<T, R>(type: string, callback: EventListener2<T, R>) {
        this.listen(type, callback, { once: true });
    }

    listenOnceOnly<T, R>(type: string, callback: EventListener2<T, R>, only: EventListener2<T, boolean>) {
        const wrapper = (e: CustomEvent<T>) => {
            if (only(e)) {
                this.remove(type, wrapper)
                callback(e)
            }
        }
        this.listen(type, wrapper)
    }

    listenDebounce<T, R>(type: string, callback: EventListener2<T, R>, options: { timeout: number, mode: "first" | "last" } & AddEventListenerOptions = { timeout: 100, mode: "last" }) {
        switch (options.mode) {
            case "first": return this.listenDebounceFirst(type, callback, options);
            case "last": return this.listenDebounceLast(type, callback, options);
        }
    }

    listenDebounceFirst<T, R>(type: string, callback: EventListener2<T, R>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
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

    listenDebounceLast<T, R>(type: string, callback: EventListener2<T, R>, options: { timeout: number } & AddEventListenerOptions = { timeout: 100 }) {
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
}

export async function atomicDo(func: () => PromiseLike<any> | any, target: EventTarget2, state: number | string | symbol = "busy", endEvent = "end") {
    if (target.state === state) await target.waitFor(endEvent);
    const previousState = target.state
    target.state = state
    const result = await func()
    target.state = previousState
    target.dispatch(endEvent)
}