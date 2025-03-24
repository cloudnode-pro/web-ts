import http from "node:http";
import {Cookie} from "../Cookie.js";
import {Request} from "../Request.js";
import {Server} from "../Server.js";

/**
 * An outgoing HTTP response.
 */
export abstract class Response {
    /**
     * The HTTP response status code to send.
     */
    public readonly statusCode: number;

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
     * Set a response cookie.
     * @param cookie The cookie to set.
     */
    public setCookie(cookie: Cookie) {
        this.headers.append("set-cookie", cookie.serialise());
    }

    /**
     * @internal
     */
    public _send(...args: Parameters<Response["send"]>): ReturnType<Response["send"]> {
        return this.send(...args);
    }

    /**
     * All (final) headers to send to the client.
     * @internal
     */
    public allHeaders(res: http.ServerResponse, server: Server, req?: Request) {
        const headers = new Headers(this.headers);
        if (req !== undefined)
            for (const [key, value] of req._responseHeaders)
                headers.set(key, value);
        if (!headers.has("date"))
            headers.set("date", new Date().toUTCString());
        if (
            req === undefined
            || req.headers.get("connection") === "close"
            || !res.shouldKeepAlive
        )
            headers.set("connection", "close");
        else {
            headers.set("connection", "keep-alive");
            headers.set("keep-alive", "timeout=" + server._keepAliveTimeout);
        }
        return headers;
    }

    /**
     * Set the HTTP response status code and headers.
     */
    protected writeHead(res: http.ServerResponse, server: Server, req?: Request) {
        const headers = this.allHeaders(res, server, req);
        for (const [key, value] of Array.from(headers.entries())
            .sort((a, b) => a[0].localeCompare(b[0])))
            res.setHeader(key, value);
        res.writeHead(this.statusCode);
    }

    /**
     * Called once by the server to send the response.
     */
    protected abstract send(res: http.ServerResponse, server: Server, req?: Request): void | Promise<void>;
}
