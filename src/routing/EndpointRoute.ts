import {Request} from "../Request.js";
import {Response} from "../response/index.js";
import {Route} from "./Route.js";

/**
 * Routes requests based on HTTP method and path.
 */
export abstract class EndpointRoute<A> implements Route<A> {
    private readonly method: Request.Method;
    private readonly path: string;

    /**
     * @param method The required HTTP method to match.
     * @param path The request URL path to match.
     */
    protected constructor(method: Request.Method, path: string) {
        this.method = method;
        this.path = path;
    }

    public match(req: Request<A>): boolean {
        return req.method === this.method && req.url.pathname === this.path;
    }

    public abstract handle(req: Request<A>): Promise<Response<A>>;
}
