import http from "node:http";
import packageJson from "../package.json" assert {type: "json"};
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

    private async listener(req: http.IncomingMessage, res: http.ServerResponse) {
        res.setHeaders(this.globalHeaders);
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

        if (this.copyOrigin) {
            res.appendHeader("Access-Control-Allow-Origin", apiRequest.headers.get("Origin") ?? "*");
            res.appendHeader("Vary", "Origin");
        }
        res.setHeaders(this.globalHeaders);

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
    };
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
