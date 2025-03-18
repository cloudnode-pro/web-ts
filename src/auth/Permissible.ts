import {Permission} from "./Permission.js";

/**
 * Represents an entity that can be checked for permissions.
 */
export interface Permissible {
    /**
     * Check whether this entity has the specified permission.
     * @param permission The permission to check.
     */
    has(permission: Permission): boolean;
}
