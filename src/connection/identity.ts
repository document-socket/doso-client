// TODO this should not be in the Connection folder
import { IdentityId } from "doso-protocol";

import { interfaces } from "../types/interfaces";

export class Identity implements interfaces.Identity {
  private id: IdentityId;
  private secret: string;

  private KEY_IDENTITY_ID = "SI";
  private KEY_IDENTITY_SECRET = "SS";

  /**
   * Return the LocalStorage key for `key`.
   * @param key
   */
  private getLSKey(key: string) {
    return `${key}_${this.container.fingerprint}`;
  }

  /**
   * @param container
   */
  constructor(private container: interfaces.Container) {
    const identityIdKey = this.getLSKey(this.KEY_IDENTITY_ID);
    const identitySecretKey = this.getLSKey(this.KEY_IDENTITY_SECRET);
    this.id = container.LocalStorage.get(identityIdKey);
    this.secret = container.LocalStorage.get(identitySecretKey);
  }

  /**
   * Return the identity id.
   */
  getId() {
    return this.id;
  }

  /**
   * Return the identity secret string.
   */
  getSecret() {
    return this.secret;
  }

  /**
   * Set a new identity.
   * @param id the IdentityId to set
   * @param secret the secret to set
   */
  setIdAndSecret(id: IdentityId, secret: string) {
    this.id = id;
    this.secret = secret;

    const identityIdKey = this.getLSKey(this.KEY_IDENTITY_ID);
    const oldIdentityId = this.container.LocalStorage.get(identityIdKey);
    if (oldIdentityId !== id) {
      // Todo: clear results cache
    }

    const identitySecretKey = this.getLSKey(this.KEY_IDENTITY_SECRET);
    this.container.LocalStorage.set(identityIdKey, id);
    this.container.LocalStorage.set(identitySecretKey, secret);
  }
}
