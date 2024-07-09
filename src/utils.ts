import { EventTarget2 } from "./index";

export async function atomicDo(func: () => PromiseLike<any> | any, target: EventTarget2, state: number | string | symbol = "busy", endEvent = "end") {
    if (target.state === state) await target.waitFor(endEvent);
    const previousState = target.state
    target.state = state
    const result = await func()
    target.state = previousState
    target.dispatch(endEvent)
}