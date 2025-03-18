import {Authorisation} from "./auth/Authorisation.js";
import {Permissible} from "./auth/Permissible.js";
import {Request} from "./Request.js";

export class AuthenticatedRequest<A> extends Request<A> implements Permissible {
    public readonly authorisation: Authorisation<A>;
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
