import {Permission} from "./Permission.js";
import {PermissionGroup} from "./PermissionGroup.js";

/**
 * A permission group with additional data.
 */
export class Authorisation<T> extends PermissionGroup {
    /**
     * Additional authentication data.
     */
    public readonly data: T;

    /**
     * Create a new authorisation.
     * @param permissions The permissions of the authorisation.
     * @param data Additional authentication data.
     */
    public constructor(permissions: Iterable<Permission>, data: T) {
        super(permissions);
        this.data = data;
    }
}
