import EventEmitter from "node:events";
import http from "node:http";
import packageJson from "../package.json" with {type: "json"};
import {Request} from "./Request.js";
import {EmptyResponse} from "./response/index.js";
import {Response} from "./response/Response.js";
import {RouteRegistry} from "./routing/RouteRegistry.js";
import {ServerErrorRegistry} from "./ServerErrorRegistry.js";

/**
 * An HTTP server.
 * @see {@link Server.Events} for events.
 */
class Server extends EventEmitter<Server.Events> {
    /**
     * Headers sent with every response.
     */
    public readonly globalHeaders: Headers;
    /**
     * This server's route registry.
     */
    public readonly routes = new RouteRegistry();
    /**
     * This server's error registry.
     */
    public readonly errors = new ServerErrorRegistry();
    private readonly server: http.Server;
    private readonly copyOrigin: boolean;
    private readonly handleConditionalRequests: boolean;

    /**
     * Create a new HTTP server.
     * @param options Server options.
     */
    public constructor(options: Server.Options) {
        super();
        this.server = http.createServer({
            joinDuplicateHeaders: true,
        }, this.listener.bind(this));

        this.globalHeaders = new Headers(options.globalHeaders);
        if (!this.globalHeaders.has("server"))
            this.globalHeaders.set("Server", `cldn/${packageJson.version}`);

        this.copyOrigin = options.copyOrigin ?? false;
        this.handleConditionalRequests = options.handleConditionalRequests ?? true;

        this.server.listen(options.port, process.env.HOST, () => this.emit("listening"));

        this.once("listening", () => {
            if (this.listenerCount("error") === 0)
                this.on("error", e => console.error("Internal Server Error:", e));
        });
    }

    /** @internal **/
    public get _keepAliveTimeout() {
        return this.server.keepAliveTimeout;
    }

    public async close(): Promise<void> {
        this.emit("closing");
        await Promise.race([
            new Promise<void>(resolve => {
                this.server.close(() => resolve());
            }),
            new Promise<void>(resolve => setTimeout(() => {
                this.server.closeAllConnections();
                resolve();
            }, 5000)),
        ]);
        this.emit("closed");
    }

    private async listener(req: http.IncomingMessage, res: http.ServerResponse) {
        let apiRequest: Request;
        try {
            apiRequest = Request.incomingMessage(req);
        }
        catch (e) {
            if (e instanceof Request.BadUrlError) {
                this.errors._get(ServerErrorRegistry.ErrorCodes.BAD_URL, null)._send(res, this);
                return;
            }
            if (e instanceof Request.SocketClosedError)
                return;
            throw e;
        }

        for (const [key, value] of this.globalHeaders)
            apiRequest._responseHeaders.set(key, value);

        if (this.copyOrigin) {
            apiRequest._responseHeaders.set("access-control-allow-origin", apiRequest.headers.get("Origin") ?? "*");
            apiRequest._responseHeaders.set("vary", "origin");
        }

        let response: Response;
        try {
            response = await this.routes.handle(apiRequest);
        }
        catch (e) {
            if (e instanceof RouteRegistry.NoRouteError)
                response = this.errors._get(ServerErrorRegistry.ErrorCodes.NO_ROUTE, apiRequest);
            else {
                this.emit("error", e as any);
                response = this.errors._get(ServerErrorRegistry.ErrorCodes.INTERNAL, apiRequest);
            }
        }
        await this.sendResponse(response, res, apiRequest);
    }

    private async sendResponse(response: Response, res: http.ServerResponse, req: Request): Promise<void> {
        conditional: if (
            this.handleConditionalRequests
            && response.statusCode === 200
            && [Request.Method.GET, Request.Method.HEAD].includes(req.method)
        ) {
            const responseHeaders = response.allHeaders(res, this, req);
            const etag = responseHeaders.get("etag");
            const lastModified = responseHeaders.has("last-modified")
                ? new Date(responseHeaders.get("last-modified")!)
                : null;
            if (etag === null && lastModified === null)
                break conditional;

            if (req.headers.has("if-match")) {
                if (!this.getETags(req.headers.get("if-match")!)
                    .filter(t => !t.startsWith("W/"))
                    .includes(etag!))
                    return this.errors._get(ServerErrorRegistry.ErrorCodes.PRECONDITION_FAILED, req)._send(res, this, req);
            }
            else if (req.headers.has("if-unmodified-since")) {
                if (lastModified === null
                    || lastModified.getTime() > new Date(req.headers.get("if-unmodified-since")!).getTime())
                    return this.errors._get(ServerErrorRegistry.ErrorCodes.PRECONDITION_FAILED, req)._send(res, this, req);
            }

            if (req.headers.has("if-none-match")) {
                if (this.getETags(req.headers.get("if-none-match")!)
                    .includes(etag!))
                    return new EmptyResponse(responseHeaders, 304)._send(res, this, req);
            }
            else if (req.headers.has("if-modified-since")) {
                if (lastModified !== null
                    && lastModified.getTime() <= new Date(req.headers.get("if-modified-since")!).getTime())
                    return new EmptyResponse(responseHeaders, 304)._send(res, this, req);
            }
        }
        response._send(res, this, req);
    }

    private getETags(header: string) {
        return header
            .split(",")
            .map(t => t.trim())
    }
}

namespace Server {
    /**
     * Server options
     */
    export interface Options {
        /**
         * The HTTP listener port. From 1 to 65535. Ports 1–1023 require
         * privileges.
         */
        readonly port: number;

        /**
         * Headers to send with every response.
         */
        readonly globalHeaders?: HeadersInit;

        /**
         * Whether to set the `Access-Control-Allow-Origin` response header to copy the `Origin` request header.
         * If enabled and the client does not set `Origin`, the header will be set to `*`.
         * Will also enable setting `Vary: Origin`.
         * @default false
         */
        readonly copyOrigin?: boolean;

        /**
         * Automatically handle conditional requests for GET and HEAD requests that result in a 200 status code.
         * `If-Range` headers are ignored.
         * @default true
         */
        readonly handleConditionalRequests?: boolean;
    }

    /**
     * Server events map
     */
    export interface Events {
        /**
         * Server is listening and ready to accept connections.
         */
        listening: [void];

        /**
         * The server is closing and not accepting new connections.
         */
        closing: [void];

        /**
         * All connections have ended and the server has closed.
         */
        closed: [void];

        /**
         * An uncaught error occurred. Client has been sent {@link ServerErrorRegistry.ErrorCodes.INTERNAL} error.
         */
        error: [Error];
    }
}

export {Server};
