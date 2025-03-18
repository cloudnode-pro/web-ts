import {Authorisation} from "./auth/Authorisation.js";
import {Permissible} from "./auth/Permissible.js";
import {Permission} from "./auth/Permission.js";
import {Request} from "./Request.js";

/**
 * A request with available {@link Authorisation}.
 */
export class AuthenticatedRequest<A> extends Request<A> implements Permissible {
    /**
     * This request’s authorisation.
     */
    public readonly authorisation: Authorisation<A>;

    /**
     * Create a new authenticated request.
     * @param authorisation
     * @param args The arguments to pass to the {@link Request} constructor.
     */
    public constructor(
        authorisation: Authorisation<A>,
        ...args: ConstructorParameters<typeof Request<A>>
    ) {
        super(...args);
        this.authorisation = authorisation;
    }

    /**
     * Check if the request has the specified permission.
     * @param permission
     */
    public has(permission: Permission): boolean {
        return this.authorisation.has(permission);
    }
}
