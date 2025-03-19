import http from "node:http";
import packageJson from "../package.json" with {type: "json"};
import {Request} from "./Request.js";
import {Response} from "./response/Response.js";
import {RouteRegistry} from "./routing/RouteRegistry.js";
import {ServerErrorRegistry} from "./ServerErrorRegistry.js";

class Server {
    /**
     * Headers sent with every response.
     */
    public readonly globalHeaders: Headers;
    /**
     * This server's route registry.
     */
    public readonly routes = new RouteRegistry();
    private readonly server: http.Server;
    private readonly copyOrigin: boolean;
    private readonly errors = new ServerErrorRegistry();

    /**
     * Create a new HTTP server.
     * @param options Server options.
     */
    public constructor(options: Server.Options) {
        this.server = http.createServer({
            joinDuplicateHeaders: true,
        }, this.listener.bind(this));

        this.globalHeaders = new Headers(options.globalHeaders);
        if (!this.globalHeaders.has("server"))
            this.globalHeaders.set("Server", `cldn/${packageJson.version}`);

        this.copyOrigin = options.copyOrigin ?? false;

        this.server.listen(options.port);
    }

    /** @internal **/
    public get _keepAliveTimeout() {
        return this.server.keepAliveTimeout;
    }

    private async listener(req: http.IncomingMessage, res: http.ServerResponse) {
        let apiRequest: Request;
        try {
            apiRequest = Request.incomingMessage(req);
        }
        catch (e) {
            if (e instanceof Request.BadUrlError) {
                this.errors._get(ServerErrorRegistry.ErrorCodes.BAD_URL)._send(res, this);
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
                response = this.errors._get(ServerErrorRegistry.ErrorCodes.NO_ROUTE);
            else {
                console.error("Internal Server Error:", e);
                response = this.errors._get(ServerErrorRegistry.ErrorCodes.INTERNAL);
            }
        }
        response._send(res, this, apiRequest);
    }

    public close(): Promise<void> {
        return Promise.race([
            new Promise<void>(resolve => {
                this.server.close(() => resolve());
            }),
            new Promise<void>(resolve => setTimeout(() => {
                this.server.closeAllConnections();
                resolve();
            }, 5000)),
        ]);
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
    }
}

export {Server};
