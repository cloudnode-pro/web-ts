import {Response} from "./response/Response.js";
import {Request} from "./Request.js";
import {TextResponse} from "./response/TextResponse.js";

/**
 * A registry for server errors.
 */
class ServerErrorRegistry<A> {
    private readonly responses: Record<ServerErrorRegistry.ErrorCodes, Response<A> | ((req?: Request<A>) => Response<A>)>;

    /**
     * Create a new server error registry initialised with default responses.
     */
    public constructor() {
        this.responses = {
            [ServerErrorRegistry.ErrorCodes.BAD_URL]:
                new TextResponse("Bad request URL.", 400),

            [ServerErrorRegistry.ErrorCodes.NO_ROUTE]:
                new TextResponse("No route in this registry matches the request.", 404),

            [ServerErrorRegistry.ErrorCodes.INTERNAL]:
                new TextResponse("An internal error occurred.", 500),
        };
    }

    /**
     * Replace server error response by registering a new custom response.
     * @param code The server error code.
     * @param response The response to send.
     */
    public register(code: ServerErrorRegistry.ErrorCodes, response: Response<A> | ((req?: Request<A>) => Response<A>)) {
        this.responses[code] = response;
    }

    /** @internal */
    public _get(code: ServerErrorRegistry.ErrorCodes, req: Request<A> | null): Response<A> {
        const r = this.responses[code];
        if (typeof r === "function") return r(req ?? void 0);
        return r;
    }
}

namespace ServerErrorRegistry {
    /**
     * Server error codes
     */
    export const enum ErrorCodes {
        BAD_URL,
        NO_ROUTE,
        INTERNAL,
    }
}

export {ServerErrorRegistry};
