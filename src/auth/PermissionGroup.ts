import {Permissible} from "./Permissible.js";
import {Permission} from "./Permission.js";

/**
 * A collection of permissions.
 */
export class PermissionGroup implements Permissible, Iterable<Permission> {
    protected readonly permissions = new Set<Permission>();

    /**
     * Create a new permission group.
     * @param permissions The permissions in this group.
     */
    public constructor(permissions: Iterable<Permission>) {
        for (const permission of permissions)
            if (!this.has(permission))
                this.permissions.add(permission);
    }

    /**
     * Check if the group has a specific permission.
     * @param permission The permission to check.
     */
    public has(permission: Permission): boolean {
        for (const existingPermission of this.permissions)
            if (existingPermission.has(permission))
                return true;
        return false;
    }

    /**
     * An iterator over the permissions in this group.
     */
    public *[Symbol.iterator]() {
        yield* this.permissions;
    }

    /**
     * All permissions in this group.
     */
    public getAll(): ReadonlyArray<Permission> {
        return Array.from(this);
    }
}
