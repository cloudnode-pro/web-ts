import {Response} from "./response/Response.js";
import {TextResponse} from "./response/TextResponse.js";

/**
 * A registry for server errors.
 */
class ServerErrorRegistry {
    private readonly responses: Record<ServerErrorRegistry.ErrorCodes, Response>;

    public register(code: ServerErrorRegistry.ErrorCodes, response: Response) {
        this.responses[code] = response;
    }

    public _get(code: ServerErrorRegistry.ErrorCodes): Response {
        return this.responses[code];
    }

    public constructor() {
        this.responses = {
            [ServerErrorRegistry.ErrorCodes.BAD_URL]: new TextResponse("Bad request URL.", 400),
            [ServerErrorRegistry.ErrorCodes.NO_ROUTE]: new TextResponse("No route in this registry matches the request.", 404),
            [ServerErrorRegistry.ErrorCodes.INTERNAL]: new TextResponse("An internal error occurred.", 500),
        };
    }
}

namespace ServerErrorRegistry {
    export const enum ErrorCodes {
        BAD_URL,
        NO_ROUTE,
        INTERNAL,
    }
}

export {ServerErrorRegistry};
