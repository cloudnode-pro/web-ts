import {Request} from "../Request.js";
import {Response} from "../response/index.js";
import {Route} from "./Route.js";

/**
 * Routes requests based on HTTP method and path.
 */
export abstract class EndpointRoute implements Route {
    private readonly method: Request.Method;
    private readonly path: string;

    /**
     * @param method The required HTTP method to match. If GET, will also match HEAD.
     * @param path The request URL path to match.
     */
    protected constructor(method: Request.Method, path: string) {
        this.method = method;
        this.path = path;
    }

    public match(req: Request): boolean {
        return this.path === req.url.pathname
            && (
                this.method === req.method
                || (this.method === Request.Method.GET && req.method === Request.Method.HEAD)
            );
    }

    public abstract handle(req: Request): Response | Promise<Response>;
}
