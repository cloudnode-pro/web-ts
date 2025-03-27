import {Response} from "./Response.js";

/**
 * An (error) response that is thrown. Will be caught by the server and sent to the client.
 */
export class ThrowableResponse<T extends Response<any>> extends Error {
    public override name = ThrowableResponse.name;

    /**
     * The response to send to the client.
     */
    protected readonly response: T;

    /**
     * An optional error to emit on the server’s error event.
     */
    protected readonly error: Error | null;

    /**
     * Create a new throwable response.
     * @param response The response to send to the client.
     * @param [error] An optional error to emit on the server’s error event.
     */
    public constructor(response: T, error?: Error) {
        super();
        this.response = response;
        this.error = error ?? null;
    }

    public getResponse(): T {
        return this.response;
    }

    public getError(): Error | null {
        return this.error;
    }
}
