import http from "node:http";
import {Request} from "../Request.js";
import {Server} from "../Server.js";

/**
 * An outgoing HTTP response.
 */
export abstract class Response {
    /**
     * The HTTP response status code to send.
     */
    protected readonly statusCode: number;

    /**
     * The HTTP response headers to send.
     */
    protected readonly headers: Headers;

    /**
     * Construct a new Response
     * @param statusCode The HTTP response status code to send.
     * @param [headers] The HTTP response headers to send.
     */
    protected constructor(statusCode: Response["statusCode"], headers: HeadersInit = {}) {
        this.statusCode = statusCode;
        this.headers = new Headers(headers);
    }

    /**
     * Set the HTTP response status code and headers.
     */
    protected writeHead(res: http.ServerResponse) {
        res.statusCode = this.statusCode;
        res.setHeaders(this.headers);
    }

    /**
     * Called once by the server to send the response.
     */
    protected abstract send(res: http.ServerResponse, server: Server, req?: Request): void | Promise<void>;

    /**
     * @internal
     */
    public _send(...args: Parameters<Response["send"]>): ReturnType<Response["send"]> {
        return this.send(...args);
    }
}
