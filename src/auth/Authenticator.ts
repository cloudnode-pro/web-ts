import {Request} from "../Request.js";
import {Authorisation} from "./Authorisation.js";

/**
 * Handles authentication for requests.
 */
export interface Authenticator<A extends any> {
    /**
     * Check whether this can handle authentication for the given request. The authenticator should return `false` if
     * the request lacks the information required to begin authentication.
     * @param request
     */
    canAuthenticate(request: Request<A>): boolean;

    /**
     * Authenticate the given request. If authenticate fails, e.g. due to missing or invalid information, such as
     * credentials, the authenticator should return `null`, which can be communicated to the client by implementing
     * applications using a 401 status response.
     * @param request
     */
    authenticate(request: Request<A>): Promise<Authorisation<A> | null>;
}
